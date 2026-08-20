from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import List, Optional
import uuid
import traceback
from decimal import Decimal
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.order import Order, OrderStatus, PaymentMethod
from app.models.model import Model3D
from app.schemas.order import OrderCreate, OrderResponse, PriceCalculateRequest, PriceResponse, PayOrderRequest, PayOrderResponse, OrderListResponse
from app.models.material import Material
from app.utils.model_utils import MATERIAL_DENSITIES, DEFAULT_INFILL, LOSS_FACTOR
from app.api.wallet import process_order_payment, NOVA_COIN_DISCOUNT_RATE, NOVA_COIN_MAX_DISCOUNT, NOVA_COIN_MAX_USAGE

router = APIRouter(prefix="/api/orders", tags=["订单"])


# ============ 材料价格（从数据库加载） ============

class MaterialPriceCache:
    """材料价格缓存，每次调用从数据库获取"""
    
    _cache = {}  # name_zh -> (price, density, name_en)
    
    @classmethod
    def refresh(cls, db):
        cls._cache = {}
        mats = db.query(Material).filter(Material.is_active == True).all()
        for m in mats:
            cls._cache[m.name_zh] = (m.price_per_gram, m.density, m.name_en)
    
    @classmethod
    def get_price(cls, material_name_zh: str, db):
        if material_name_zh not in cls._cache:
            cls.refresh(db)
        entry = cls._cache.get(material_name_zh)
        if entry:
            return entry[0]
        return 0.6  # 默认
    
    @classmethod
    def get_density_name(cls, material_name_zh: str, db):
        if material_name_zh not in cls._cache:
            cls.refresh(db)
        entry = cls._cache.get(material_name_zh)
        if entry:
            return entry[1], entry[2]
        return 1.24, "pla"  # 默认PLA

# 从数据库获取材料中文名到英文名映射
MATERIAL_CN_TO_EN = {
    "树脂": "resin",
    "PLA": "pla",
    "ABS": "abs",
    "尼龙": "nylon",
    "PETG": "petg",
}


def calculate_price_internal(
    weight_grams: float,
    material: str,
    layer_height: float,
    quantity: int,
    scale: float = 1.0,
    db: Session = None,
) -> PriceResponse:
    """计算打印价格
    
    Args:
        weight_grams: 模型重量(g)，由model_utils计算并存储（原始尺寸）
        material: 材料名称（中文）
        layer_height: 层高(mm)
        quantity: 数量
        scale: 等比例缩放系数
        db: 数据库会话(可选)，传了则从数据库获取实时价格
    """
    if db:
        material_price_per_gram = MaterialPriceCache.get_price(material, db)
    else:
        material_price_per_gram = 0.6  # 默认
    
    # 缩放后的实际重量 = 原始重量 × scale³
    scaled_weight = weight_grams * (scale ** 3)
    
    # 直接使用存储的重量（已由model_utils用shell+infill模型计算）
    material_fee = scaled_weight * material_price_per_gram * quantity

    # 层高越小，价格越高（打印时间越长）
    # 以0.2mm为基准，层高越小价格越高
    layer_multiplier = 0.2 / layer_height if layer_height > 0 else 1.0
    material_fee *= layer_multiplier
    
    # 模型费用（按重量估算，基础费用）
    model_price = 5.0 + (weight_grams * 0.1)

    # 运费（固定）
    shipping_fee = 15.0 if quantity <= 3 else 25.0

    total = round(model_price + material_fee + shipping_fee, 2)
    return PriceResponse(
        model_price=round(model_price, 2),
        material_fee=round(material_fee, 2),
        shipping_fee=round(shipping_fee, 2),
        total_price=total,
    )


def _order_to_response(order: Order, db: Session) -> OrderResponse:
    """将 Order ORM 转为 OrderResponse，同时填充 model_name"""
    resp = OrderResponse.model_validate(order, from_attributes=True)
    if order.model_id:
        mdl = db.query(Model3D).filter(Model3D.id == order.model_id).first()
        if mdl:
            resp.model_name = mdl.name
    return resp


@router.post("/calculate-price", response_model=PriceResponse)
def calc_price(req: PriceCalculateRequest, db: Session = Depends(get_db)):
    """计算打印价格（无需登录）"""
    try:
        # 如果前端传了重量，直接用；否则用包围盒粗略估算
        weight_grams = getattr(req, 'weight', None) or 50.0
        
        # 如果没有重量但有尺寸，用包围盒体积粗略估算
        if weight_grams == 50.0 and req.dimensions_x and req.dimensions_y and req.dimensions_z:
            volume_cm3 = (req.dimensions_x * req.dimensions_y * req.dimensions_z) / 1000
            # 粗略估算: 假设10%的材料利用率
            weight_grams = volume_cm3 * 1.24 * 0.10

        return calculate_price_internal(
            weight_grams=weight_grams,
            material=req.material,
            layer_height=req.layer_height,
            quantity=req.quantity,
            scale=getattr(req, 'scale', 1.0) or 1.0,
            db=db,
        )
    except Exception as e:
        print(f"ERROR in calc_price: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============ 订单管理 ============

@router.post("")
def create_order(req: OrderCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """创建订单并自动余额支付"""
    try:
        user_id = user.id
        
        # 获取模型信息（如果有）
        model_price = 0.0
        weight_grams = 50.0  # 默认重量

        if req.model_id:
            model = db.query(Model3D).filter(Model3D.id == req.model_id).first()
            if model:
                model_price = model.base_price
                # 优先使用模型存储的重量
                if model.weight:
                    weight_grams = model.weight

        # 计算价格（考虑缩放）
        scale = req.print_config.scale if req.print_config.scale else 1.0
        price = calculate_price_internal(
            weight_grams=weight_grams,
            material=req.print_config.material,
            layer_height=req.print_config.layer_height,
            quantity=req.print_config.quantity,
            scale=scale,
            db=db,
        )

        # 模型价格按 scale³ 缩放
        scaled_model_price = model_price * (scale ** 3) * req.print_config.quantity

        # 最终价格 = 模型价格 + 材料费 + 运费
        total_price = scaled_model_price + price.material_fee + price.shipping_fee

        # 生成订单号
        order_no = f"3DP{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"

        order = Order(
            order_no=order_no,
            user_id=user_id,
            model_id=req.model_id,
            status=OrderStatus.PENDING,
            print_config=req.print_config.model_dump(),
            model_price=scaled_model_price,
            material_fee=price.material_fee,
            shipping_fee=price.shipping_fee,
            total_price=total_price,
            recipient_name=req.recipient_name,
            recipient_phone=req.recipient_phone,
            shipping_address=req.shipping_address,
            note=req.note,
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        
        print(f"DEBUG: Order created - {order.order_no}, total: {order.total_price}")
        
        # 尝试余额支付
        if req.use_balance:
            try:
                payment_result = process_order_payment(order, user, db, use_nova=req.use_nova)
                resp = _order_to_response(order, db)
                return {
                    **resp.model_dump(),
                    "payment": payment_result,
                }
            except Exception as pay_err:
                print(f"余额支付异常（订单已创建，保持待付款）: {pay_err}")
                traceback.print_exc()
        
        return _order_to_response(order, db)
    except Exception as e:
        print(f"ERROR in create_order: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my", response_model=List[OrderResponse])
def list_my_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的订单列表"""
    query = db.query(Order).filter(Order.user_id == user.id)
    if status_filter:
        try:
            query = query.filter(Order.status == OrderStatus(status_filter))
        except ValueError:
            pass
    
    orders = query.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return [_order_to_response(o, db) for o in orders]


@router.get("/all", response_model=OrderListResponse)
def list_all_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取所有订单列表（管理员用）"""
    if user.role.value not in ('admin'):
        raise HTTPException(status_code=403, detail="仅管理员可查看所有订单")
    
    query = db.query(Order)
    if status_filter:
        try:
            query = query.filter(Order.status == OrderStatus(status_filter))
        except ValueError:
            pass
    
    if search:
        # 搜索订单号、收货人、收货地址
        like = f"%{search}%"
        query = query.filter(
            or_(
                Order.order_no.ilike(like),
                Order.recipient_name.ilike(like),
                Order.recipient_phone.ilike(like),
                Order.shipping_address.ilike(like),
            )
        )
    
    total = query.count()
    orders = query.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return OrderListResponse(total=total, items=[_order_to_response(o, db) for o in orders])


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """获取订单详情"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    return _order_to_response(order, db)


@router.put("/{order_id}/status")
def update_order_status(
    order_id: int,
    status: str = Body(..., embed=True),
    tracking_no: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
):
    """更新订单状态（管理员用）"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    try:
        new_status = OrderStatus(status)
        order.status = new_status
        
        # 更新相关时间戳
        if new_status == OrderStatus.PAID:
            order.paid_at = datetime.now()
        elif new_status == OrderStatus.SHIPPED:
            order.shipped_at = datetime.now()
            if tracking_no:
                order.tracking_no = tracking_no
        elif new_status == OrderStatus.COMPLETED:
            pass  # 完成时间暂不记录
        
        db.commit()
        return {"message": "状态已更新", "status": status}
    except ValueError:
        raise HTTPException(status_code=400, detail=f"无效的状态值: {status}")


@router.put("/{order_id}/cancel")
def cancel_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """取消订单（用户用）- 退余额和Nova豆"""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).with_for_update().first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status not in [OrderStatus.PENDING, OrderStatus.PAID]:
        raise HTTPException(status_code=400, detail="订单当前状态无法取消")
    
    # 已付款的订单取消时退还余额和Nova豆（原子操作）
    refund_balance = 0.0
    if order.status == OrderStatus.PAID and order.balance_paid and order.balance_paid > 0:
        refund_balance = order.balance_paid
        db.execute(
            text("UPDATE user SET balance = balance + :amount WHERE id = :uid"),
            {"amount": float(order.balance_paid), "uid": user.id},
        )
    
    if order.nova_coins_used and order.nova_coins_used > 0:
        db.execute(
            text("UPDATE user SET nova_coins = nova_coins + :amount WHERE id = :uid"),
            {"amount": order.nova_coins_used, "uid": user.id},
        )
    
    db.refresh(user)
    order.status = OrderStatus.CANCELLED
    db.commit()
    
    msg = "订单已取消"
    if refund_balance > 0:
        msg += f"，已退还余额 ¥{refund_balance:.2f}"
    if order.nova_coins_used and order.nova_coins_used > 0:
        msg += f"，已退还 {order.nova_coins_used} 个Nova豆"
    
    return {"message": msg}


@router.delete("/{order_id}")
def delete_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """删除订单（仅限已完成或已取消的订单）"""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status not in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="仅已完成或已取消的订单可以删除")
    
    db.delete(order)
    db.commit()
    return {"message": "订单已删除"}


# ============ 支付接口 ============

@router.post("/{order_id}/pay", response_model=PayOrderResponse)
def pay_order(
    order_id: int,
    req: PayOrderRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """订单支付接口
    
    支持三种支付方式：
    - balance: 余额支付（+Nova豆折扣）
    - wechat: 微信扫码支付（模拟）
    - alipay: 支付宝扫码支付（模拟）
    """
    # 加行锁防止并发支付/取消
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).with_for_update().first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=400, detail="订单状态不允许支付")
    
    total = Decimal(str(order.total_price))
    
    # 1. 计算Nova豆折扣
    nova_discount = Decimal("0")
    nova_used = 0
    if req.use_nova and user.nova_coins > 0:
        usable = min(user.nova_coins, NOVA_COIN_MAX_USAGE)
        if req.nova_coins_override is not None:
            usable = min(req.nova_coins_override, user.nova_coins)
        max_discount = total * Decimal(str(NOVA_COIN_MAX_DISCOUNT))
        discount_per = total * Decimal(str(NOVA_COIN_DISCOUNT_RATE))
        nova_discount = min(discount_per * Decimal(str(usable)), max_discount)
        nova_discount = Decimal(str(round(float(nova_discount), 2)))
        nova_used = int(min(usable, max(1, round(float(nova_discount / (discount_per if discount_per > 0 else Decimal('0.01')))))))
        nova_used = min(nova_used, user.nova_coins, NOVA_COIN_MAX_USAGE)
    
    after_discount = total - nova_discount
    if after_discount < Decimal("0"):
        after_discount = Decimal("0")
    
    if req.method == "balance":
        # 余额支付
        paid_by_balance = min(user.balance, after_discount)
        remaining = after_discount - paid_by_balance
        
        user.balance -= paid_by_balance
        user.nova_coins -= nova_used
        
        order.status = OrderStatus.PAID
        order.paid_at = datetime.now()
        order.payment_method = PaymentMethod(req.method)
        order.nova_coins_used = nova_used
        order.nova_discount = float(nova_discount)
        order.balance_paid = float(paid_by_balance)
        db.commit()
        
        if remaining <= 0:
            return PayOrderResponse(
                order_id=order.id, order_no=order.order_no,
                method="balance",
                total_price=float(total),
                nova_discount=float(nova_discount),
                balance_paid=float(paid_by_balance),
                remaining=0,
                status="paid",
                message="余额支付成功",
            )
        else:
            return PayOrderResponse(
                order_id=order.id, order_no=order.order_no,
                method="balance",
                total_price=float(total),
                nova_discount=float(nova_discount),
                balance_paid=float(paid_by_balance),
                remaining=float(remaining),
                status="partial",
                message=f"余额不足，还需支付 ¥{float(remaining):.2f}，请选择其他方式",
            )
    
    elif req.method in ("wechat", "alipay"):
        # 模拟线上支付：生成本地二维码
        # 先扣除Nova豆折扣部分（折扣立即生效）
        user.nova_coins -= nova_used
        order.nova_coins_used = nova_used
        order.nova_discount = float(nova_discount)
        
        # 模拟生成二维码数据
        import json
        qr_data = json.dumps({
            "type": req.method,
            "order_no": order.order_no,
            "amount": float(round(after_discount, 2)),
            "timestamp": datetime.now().isoformat(),
            "merchant": "打个东西",
        }, ensure_ascii=False)
        
        # 标记支付方式（状态仍为 PENDING，前端扫码后调 confirm-pay）
        order.payment_method = PaymentMethod(req.method)
        order.balance_paid = 0.0
        db.commit()
        
        return PayOrderResponse(
            order_id=order.id, order_no=order.order_no,
            method=req.method,
            total_price=float(total),
            nova_discount=float(nova_discount),
            balance_paid=0,
            remaining=float(round(after_discount, 2)),
            status="pending_online",
            message=f"请使用{ '微信' if req.method == 'wechat' else '支付宝' }扫码支付 ¥{float(round(after_discount, 2)):.2f}",
            qr_data=qr_data,
        )
    
    else:
        raise HTTPException(status_code=400, detail=f"不支持的支付方式: {req.method}")


@router.post("/{order_id}/confirm-pay")
def confirm_pay(
    order_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """模拟扫码支付完成（仅用于演示）"""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=400, detail="订单状态不允许确认支付")
    
    order.status = OrderStatus.PAID
    order.paid_at = datetime.now()
    order.transaction_id = f"SIM{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
    db.commit()
    
    return {
        "message": "支付成功",
        "order_no": order.order_no,
        "status": "paid",
        "paid_at": order.paid_at.isoformat(),
        "transaction_id": order.transaction_id,
    }


@router.get("/{order_id}/payment-status")
def get_payment_status(
    order_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查询订单支付状态"""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    return {
        "order_id": order.id,
        "order_no": order.order_no,
        "status": order.status.value if hasattr(order.status, 'value') else order.status,
        "total_price": order.total_price,
        "payment_method": order.payment_method.value if order.payment_method and hasattr(order.payment_method, 'value') else order.payment_method,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "nova_coins_used": order.nova_coins_used,
        "nova_discount": order.nova_discount,
        "balance_paid": order.balance_paid,
    }