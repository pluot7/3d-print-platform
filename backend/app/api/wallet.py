from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from decimal import Decimal
from datetime import datetime
from app.core.database import get_db
from app.api.deps import get_current_user, get_admin_user
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.schemas.user import RechargeRequest, NovaCoinAward

router = APIRouter(prefix="/api/wallet", tags=["钱包"])

NOVA_COIN_DISCOUNT_RATE = 0.005  # 每个Nova豆折扣0.5%
NOVA_COIN_MAX_DISCOUNT = 0.50   # 最多折扣50%
NOVA_COIN_MAX_USAGE = 100       # 最多使用100个Nova豆


@router.get("/balance")
def get_balance(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取账户余额和Nova豆"""
    return {
        "balance": float(user.balance),
        "nova_coins": user.nova_coins,
    }


@router.post("/recharge")
def recharge(
    req: RechargeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """充值余额（模拟支付成功，直接到账）"""
    amount = Decimal(str(req.amount))
    user.balance += amount
    db.commit()
    db.refresh(user)
    return {
        "message": "充值成功",
        "amount": float(amount),
        "balance": float(user.balance),
    }


@router.get("/calculate-nova-discount")
def calculate_nova_discount(
    total_price: float,
    user: User = Depends(get_current_user),
):
    """计算Nova豆可带来的折扣（不下单时预览用）"""
    usable = min(user.nova_coins, NOVA_COIN_MAX_USAGE)
    max_discount_amount = total_price * NOVA_COIN_MAX_DISCOUNT
    discount_per_coin = total_price * NOVA_COIN_DISCOUNT_RATE
    actual_discount = min(discount_per_coin * usable, max_discount_amount)
    return {
        "nova_coins_owned": user.nova_coins,
        "nova_coins_usable": usable,
        "discount_amount": round(actual_discount, 2),
        "final_amount": round(total_price - actual_discount, 2),
    }


# ============ 支付处理（订单下单时调用） ============

def process_order_payment(
    order: Order,
    user: User,
    db: Session,
    use_nova: bool = True,
) -> dict:
    """处理订单支付：余额优先 + Nova豆折扣
    
    Returns:
        支付结果字典
    """
    total = Decimal(str(order.total_price))
    
    # 1. 计算Nova豆折扣
    nova_discount = Decimal("0")
    nova_used = 0
    if use_nova and user.nova_coins > 0:
        usable_nova = min(user.nova_coins, NOVA_COIN_MAX_USAGE)
        max_discount_amount = total * Decimal(str(NOVA_COIN_MAX_DISCOUNT))
        discount_per_coin = total * Decimal(str(NOVA_COIN_DISCOUNT_RATE))
        nova_discount = min(discount_per_coin * usable_nova, max_discount_amount)
        # 取整到分
        nova_discount = Decimal(str(round(float(nova_discount), 2)))
        nova_used = int(min(usable_nova, max(1, round(float(nova_discount / (discount_per_coin if discount_per_coin > 0 else Decimal('0.01')))))))
        nova_used = min(nova_used, user.nova_coins, NOVA_COIN_MAX_USAGE)
    
    # 折扣后的应付款
    after_discount = total - nova_discount
    if after_discount < Decimal("0"):
        after_discount = Decimal("0")
    
    # 2. 余额支付
    paid_by_balance = min(user.balance, after_discount)
    remaining = after_discount - paid_by_balance
    
    # 3. 原子扣款（并发安全：用 SQL 而非 Python 加减，避免并发覆盖）
    if float(paid_by_balance) > 0:
        # 原子 UPDATE：balance = balance - x WHERE balance >= x
        result = db.execute(
            text("UPDATE user SET balance = balance - :amount WHERE id = :uid AND balance >= :amount"),
            {"amount": float(paid_by_balance), "uid": user.id},
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=400, detail="余额不足，支付失败")
    
    if nova_used > 0:
        db.execute(
            text("UPDATE user SET nova_coins = nova_coins - :amount WHERE id = :uid AND nova_coins >= :amount"),
            {"amount": nova_used, "uid": user.id},
        )
    
    # 刷新 user 确保 ORM session 中的数据同步
    db.refresh(user)
    
    order.status = OrderStatus.PAID
    order.paid_at = datetime.now()
    
    # 记录支付信息
    order.payment_method = "balance"  # 标记为余额支付
    order.nova_coins_used = nova_used
    order.nova_discount = float(nova_discount)
    order.balance_paid = float(paid_by_balance)
    
    db.commit()
    
    result = {
        "order_id": order.id,
        "order_no": order.order_no,
        "total_price": float(total),
        "nova_coins_used": nova_used,
        "nova_discount": float(nova_discount),
        "balance_paid": float(paid_by_balance),
        "remaining_to_pay": float(remaining),
        "status": "paid" if remaining <= 0 else "partial",
    }
    
    if remaining > 0:
        result["message"] = f"余额不足，还需支付 ¥{float(remaining):.2f}"
    else:
        result["message"] = "支付成功"
    
    return result


# ============ 管理员接口 ============

@router.get("/admin/users")
def list_all_users_balance(
    user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """管理员查看所有用户余额"""
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role.value if hasattr(u.role, 'value') else u.role,
            "balance": float(u.balance),
            "nova_coins": u.nova_coins,
        }
        for u in users
    ]


@router.post("/admin/award-nova")
def award_nova_coins(
    req: NovaCoinAward,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """管理员赠送Nova豆"""
    target = db.query(User).filter(User.id == req.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    target.nova_coins += req.amount
    db.commit()
    db.refresh(target)
    
    return {
        "message": f"已赠送 {req.amount} 个Nova豆给 {target.username}",
        "reason": req.reason,
        "user_id": target.id,
        "username": target.username,
        "nova_coins": target.nova_coins,
    }
