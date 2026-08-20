from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.address import Address
from app.schemas.address import AddressCreate, AddressUpdate, AddressResponse

router = APIRouter(prefix="/api/addresses", tags=["收货地址"])


@router.get("", response_model=List[AddressResponse])
def list_addresses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """获取当前用户的所有收货地址"""
    addresses = db.query(Address).filter(Address.user_id == user.id).order_by(Address.is_default.desc(), Address.created_at.desc()).all()
    return addresses


@router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
def create_address(data: AddressCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """新增收货地址"""
    # 如果设为默认地址，先取消其他默认
    if data.is_default:
        db.query(Address).filter(Address.user_id == user.id, Address.is_default == True).update({"is_default": False})

    # 如果是第一个地址，自动设为默认
    existing_count = db.query(Address).filter(Address.user_id == user.id).count()
    if existing_count == 0:
        data.is_default = True

    address = Address(
        user_id=user.id,
        **data.model_dump(),
    )
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.put("/{address_id}", response_model=AddressResponse)
def update_address(address_id: int, data: AddressUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """更新收货地址"""
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="地址不存在")

    # 如果设为默认地址，先取消其他默认
    if data.is_default:
        db.query(Address).filter(Address.user_id == user.id, Address.is_default == True).update({"is_default": False})

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(address, key, value)

    db.commit()
    db.refresh(address)
    return address


@router.delete("/{address_id}")
def delete_address(address_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """删除收货地址"""
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="地址不存在")

    was_default = address.is_default
    db.delete(address)
    db.commit()

    # 如果删除的是默认地址，将最新的一个设为默认
    if was_default:
        first = db.query(Address).filter(Address.user_id == user.id).order_by(Address.created_at.desc()).first()
        if first:
            first.is_default = True
            db.commit()

    return {"message": "删除成功"}


@router.put("/{address_id}/default", response_model=AddressResponse)
def set_default_address(address_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """设为默认地址"""
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="地址不存在")

    # 取消当前默认
    db.query(Address).filter(Address.user_id == user.id, Address.is_default == True).update({"is_default": False})
    address.is_default = True
    db.commit()
    db.refresh(address)
    return address
