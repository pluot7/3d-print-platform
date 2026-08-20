"""
通知 + 关注 + 动态 + 私信 API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func as sa_func, or_, and_
from typing import Optional, List
from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification, NotificationType, Follow, Activity, ActivityType, Conversation, Message, UserConversationStatus
from app.models.discussion import Discussion, DiscussionReply, ModelComment
from app.models.model import Model3D
from app.schemas.notification import (
    NotificationResponse, NotificationListResponse, MarkReadRequest,
    FollowResponse, FollowListResponse, FollowUserBrief,
    ActivityResponse, ActivityListResponse, UserProfileResponse,
    MessageResponse, SendMessageRequest, ConversationBrief,
    ConversationListResponse, MessageListResponse, UnreadCountResponse,
)
from app.schemas.user import NotificationPreferencesRequest
from app.api.deps import get_current_user, get_optional_user

router = APIRouter(prefix="/api", tags=["通知·关注·动态·私信"])


# ============ 工具函数 =============

def _notification_to_response(n: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=n.id,
        user_id=n.user_id,
        type=n.type,
        title=n.title,
        content=n.content,
        is_read=n.is_read,
        related_user_id=n.related_user_id,
        related_model_id=n.related_model_id,
        related_discussion_id=n.related_discussion_id,
        related_comment_id=n.related_comment_id,
        related_url=n.related_url,
        created_at=n.created_at,
    )


def _get_user_brief(u: User) -> FollowUserBrief:
    return FollowUserBrief(
        id=u.id,
        username=u.username,
        full_name=u.full_name,
        avatar_url=u.avatar_url,
    )


def create_notification(
    db: Session,
    user_id: int,
    type: NotificationType,
    title: str,
    content: Optional[str] = None,
    related_user_id: Optional[int] = None,
    related_model_id: Optional[int] = None,
    related_discussion_id: Optional[int] = None,
    related_comment_id: Optional[int] = None,
    related_url: Optional[str] = None,
):
    """创建通知（工具函数，供其他API调用）"""
    # 不给自己的操作发通知
    if related_user_id == user_id:
        return

    # 检查用户的通知偏好
    target_user = db.query(User).filter(User.id == user_id).first()
    if target_user:
        if type == NotificationType.FOLLOW_ACTIVITY and not target_user.notify_activities:
            return
        if type in (NotificationType.MESSAGE,) and not target_user.notify_messages:
            return

    n = Notification(
        user_id=user_id,
        type=type,
        title=title,
        content=content,
        related_user_id=related_user_id,
        related_model_id=related_model_id,
        related_discussion_id=related_discussion_id,
        related_comment_id=related_comment_id,
        related_url=related_url,
    )
    db.add(n)
    db.commit()
    return n


# ============ 通知 =============

@router.get("/notifications", response_model=NotificationListResponse)
def list_notifications(
    unread_only: bool = Query(False, description="仅查未读"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)

    total = q.count()
    unread_count = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False,
    ).count()

    items = (
        q.order_by(desc(Notification.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return NotificationListResponse(
        total=total,
        unread_count=unread_count,
        items=[_notification_to_response(n) for n in items],
    )


@router.put("/notifications/read", response_model=dict)
def mark_notifications_read(
    data: MarkReadRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """标记通知为已读（ids为空则标记全部）"""
    q = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False,
    )
    if data.ids:
        q = q.filter(Notification.id.in_(data.ids))
    q.update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifications_unread = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False,
    ).count()

    # 私信未读数：所有参与会话中，我自己未读的消息数
    conversations_unread = 0
    conv_statuses = db.query(UserConversationStatus).filter(
        UserConversationStatus.user_id == user.id,
    ).all()
    for cs in conv_statuses:
        if cs.last_read_message_id:
            unread = db.query(Message).filter(
                Message.conversation_id == cs.conversation_id,
                Message.id > cs.last_read_message_id,
                Message.sender_id != user.id,
            ).count()
            conversations_unread += unread
        else:
            total_in_conv = db.query(Message).filter(
                Message.conversation_id == cs.conversation_id,
                Message.sender_id != user.id,
            ).count()
            conversations_unread += total_in_conv

    return UnreadCountResponse(
        notifications=notifications_unread,
        conversations=conversations_unread,
    )


# ============ 用户通知偏好 =============

@router.get("/notifications/preferences", response_model=NotificationPreferencesRequest)
def get_notification_preferences(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return NotificationPreferencesRequest(
        notify_activities=user.notify_activities,
        notify_messages=user.notify_messages,
    )


@router.put("/notifications/preferences", response_model=NotificationPreferencesRequest)
def update_notification_preferences(
    data: NotificationPreferencesRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.notify_activities is not None:
        user.notify_activities = data.notify_activities
    if data.notify_messages is not None:
        user.notify_messages = data.notify_messages
    db.commit()
    db.refresh(user)
    return NotificationPreferencesRequest(
        notify_activities=user.notify_activities,
        notify_messages=user.notify_messages,
    )


# ============ 关注 =============

@router.post("/users/{user_id}/follow", response_model=dict)
def follow_user(
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="不能关注自己")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")

    existing = db.query(Follow).filter(
        Follow.follower_id == user.id,
        Follow.following_id == user_id,
    ).first()
    if existing:
        return {"ok": True, "status": "already_following"}

    f = Follow(follower_id=user.id, following_id=user_id)
    db.add(f)

    create_notification(
        db=db,
        user_id=user_id,
        type=NotificationType.FOLLOW,
        title=f"{user.username} 关注了你",
        content=f"用户 {user.username} 关注了你",
        related_user_id=user.id,
    )

    db.commit()
    return {"ok": True, "status": "followed"}


@router.delete("/users/{user_id}/follow", response_model=dict)
def unfollow_user(
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    f = db.query(Follow).filter(
        Follow.follower_id == user.id,
        Follow.following_id == user_id,
    ).first()
    if f:
        db.delete(f)
        db.commit()
    return {"ok": True}


@router.get("/users/{user_id}/followers", response_model=FollowListResponse)
def list_followers(
    user_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")

    q = db.query(Follow).filter(Follow.following_id == user_id).order_by(desc(Follow.created_at))
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return FollowListResponse(
        total=total,
        items=[FollowResponse(
            id=f.id,
            user=_get_user_brief(f.follower),
            created_at=f.created_at,
        ) for f in items],
    )


@router.get("/users/{user_id}/following", response_model=FollowListResponse)
def list_following(
    user_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")

    q = db.query(Follow).filter(Follow.follower_id == user_id).order_by(desc(Follow.created_at))
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return FollowListResponse(
        total=total,
        items=[FollowResponse(
            id=f.id,
            user=_get_user_brief(f.following),
            created_at=f.created_at,
        ) for f in items],
    )


@router.get("/users/{user_id}/profile", response_model=UserProfileResponse)
def get_user_profile(
    user_id: int,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")

    follower_count = db.query(Follow).filter(Follow.following_id == user_id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == user_id).count()
    discussion_count = db.query(Discussion).filter(Discussion.user_id == user_id).count()
    model_count = db.query(Model3D).filter(Model3D.uploader_id == user_id, Model3D.status == "approved").count()

    is_following = False
    if user:
        existing = db.query(Follow).filter(
            Follow.follower_id == user.id,
            Follow.following_id == user_id,
        ).first()
        is_following = existing is not None

    return UserProfileResponse(
        id=target.id,
        username=target.username,
        full_name=target.full_name,
        avatar_url=target.avatar_url,
        bio=None,
        follower_count=follower_count,
        following_count=following_count,
        discussion_count=discussion_count,
        model_count=model_count,
        is_following=is_following,
        created_at=target.created_at,
    )


# ============ 动态 =============

def create_activity(
    db: Session,
    user_id: int,
    type: ActivityType,
    title: str,
    content_preview: Optional[str] = None,
    discussion_id: Optional[int] = None,
    model_id: Optional[int] = None,
):
    """创建用户动态（不提交，让调用方统一提交）"""
    a = Activity(
        user_id=user_id,
        type=type,
        title=title,
        content_preview=content_preview,
        discussion_id=discussion_id,
        model_id=model_id,
    )
    db.add(a)
    db.flush()

    # 给所有关注者推送通知（根据偏好过滤由create_notification内部处理）
    followers = db.query(Follow).filter(Follow.following_id == user_id).all()
    for f in followers:
        notification = Notification(
            user_id=f.follower_id,
            type=NotificationType.FOLLOW_ACTIVITY,
            title=title,
            content=content_preview or title,
            related_user_id=user_id,
            related_discussion_id=discussion_id,
            related_model_id=model_id,
        )
        # 检查通知偏好
        target_user = db.query(User).filter(User.id == f.follower_id).first()
        if target_user and target_user.notify_activities:
            db.add(notification)

    return a


def create_activity_and_commit(db, user_id, type, title, content_preview=None, discussion_id=None, model_id=None):
    """创建动态 + 推送通知并提交"""
    a = create_activity(db, user_id, type, title, content_preview, discussion_id, model_id)
    db.commit()
    return a


@router.get("/activities", response_model=ActivityListResponse)
def list_activities(
    user_id: Optional[int] = Query(None, description="指定用户的动态，不填则查全部"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Activity)
    if user_id:
        q = q.filter(Activity.user_id == user_id)

    total = q.count()
    items = (
        q.order_by(desc(Activity.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # 批量查询用户信息
    user_ids = list(set(a.user_id for a in items))
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: u for u in users}

    return ActivityListResponse(
        total=total,
        items=[ActivityResponse(
            id=a.id,
            user_id=a.user_id,
            username=users_map[a.user_id].username if a.user_id in users_map else '',
            avatar_url=users_map[a.user_id].avatar_url if a.user_id in users_map else None,
            type=a.type,
            title=a.title,
            content_preview=a.content_preview,
            discussion_id=a.discussion_id,
            model_id=a.model_id,
            created_at=a.created_at,
        ) for a in items],
    )


@router.get("/activities/following", response_model=ActivityListResponse)
def list_following_activities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    following_ids = [
        f.following_id
        for f in db.query(Follow).filter(Follow.follower_id == user.id).all()
    ]
    if not following_ids:
        return ActivityListResponse(total=0, items=[])

    q = db.query(Activity).filter(Activity.user_id.in_(following_ids))
    total = q.count()
    items = (
        q.order_by(desc(Activity.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # 批量查询用户信息
    user_ids = list(set(a.user_id for a in items))
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: u for u in users}

    return ActivityListResponse(
        total=total,
        items=[ActivityResponse(
            id=a.id,
            user_id=a.user_id,
            username=users_map[a.user_id].username if a.user_id in users_map else '',
            avatar_url=users_map[a.user_id].avatar_url if a.user_id in users_map else None,
            type=a.type,
            title=a.title,
            content_preview=a.content_preview,
            discussion_id=a.discussion_id,
            model_id=a.model_id,
            created_at=a.created_at,
        ) for a in items],
    )


# ============ 私信系统 =============

def _get_or_create_conversation(db: Session, user1_id: int, user2_id: int) -> Conversation:
    """获取或创建两个用户之间的会话"""
    a, b = sorted([user1_id, user2_id])
    conv = db.query(Conversation).filter(
        Conversation.user1_id == a,
        Conversation.user2_id == b,
    ).first()
    if conv:
        return conv

    conv = Conversation(user1_id=a, user2_id=b)
    db.add(conv)
    db.flush()

    # 为双方创建会话状态
    for uid in (a, b):
        status = UserConversationStatus(user_id=uid, conversation_id=conv.id)
        db.add(status)
    db.flush()
    return conv


@router.get("/conversations", response_model=ConversationListResponse)
def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的会话列表"""
    # 找到用户参与的所有会话
    convs = (
        db.query(Conversation)
        .filter(
            or_(Conversation.user1_id == user.id, Conversation.user2_id == user.id)
        )
        .order_by(desc(Conversation.last_message_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for conv in convs:
        other = conv.user1 if conv.user1_id != user.id else conv.user2
        
        # 获取该用户的会话状态
        status = db.query(UserConversationStatus).filter(
            UserConversationStatus.user_id == user.id,
            UserConversationStatus.conversation_id == conv.id,
        ).first()

        # 计算未读数
        unread_count = 0
        if status and status.last_read_message_id:
            unread_count = db.query(Message).filter(
                Message.conversation_id == conv.id,
                Message.id > status.last_read_message_id,
                Message.sender_id != user.id,
            ).count()
        else:
            unread_count = db.query(Message).filter(
                Message.conversation_id == conv.id,
                Message.sender_id != user.id,
            ).count()

        # 最后一条消息预览
        last_msg = db.query(Message).filter(
            Message.conversation_id == conv.id
        ).order_by(desc(Message.created_at)).first()

        items.append(ConversationBrief(
            id=conv.id,
            other_user=_get_user_brief(other),
            last_message=last_msg.content[:100] if last_msg else None,
            last_message_at=last_msg.created_at if last_msg else conv.last_message_at,
            unread_count=unread_count,
            is_muted=status.is_muted if status else False,
        ))

    total = len(items)  # 简化：后续可加count优化
    return ConversationListResponse(total=total, items=items)


@router.put("/conversations/read-all", response_model=dict)
def mark_all_conversations_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """一键标记所有会话为已读"""
    # 获取该用户参与的所有会话
    convs = (
        db.query(Conversation)
        .filter(
            or_(Conversation.user1_id == user.id, Conversation.user2_id == user.id)
        )
        .all()
    )
    for conv in convs:
        # 获取该会话中对方发送的最新消息ID
        last_other_msg = (
            db.query(sa_func.max(Message.id))
            .filter(
                Message.conversation_id == conv.id,
                Message.sender_id != user.id,
            )
            .scalar()
        )
        if last_other_msg:
            status = db.query(UserConversationStatus).filter(
                UserConversationStatus.user_id == user.id,
                UserConversationStatus.conversation_id == conv.id,
            ).first()
            if status:
                status.last_read_message_id = last_other_msg
            else:
                db.add(UserConversationStatus(
                    user_id=user.id,
                    conversation_id=conv.id,
                    last_read_message_id=last_other_msg,
                ))
            # 标记消息为已读
            db.query(Message).filter(
                Message.conversation_id == conv.id,
                Message.sender_id != user.id,
                Message.is_read == False,
            ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"ok": True}


@router.get("/conversations/{conv_id}/messages", response_model=MessageListResponse)
def get_conversation_messages(
    conv_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取会话的消息列表，并自动标记为已读"""
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")
    if conv.user1_id != user.id and conv.user2_id != user.id:
        raise HTTPException(status_code=403, detail="无权访问此会话")

    q = db.query(Message).filter(Message.conversation_id == conv_id)
    total = q.count()
    items = (
        q.order_by(desc(Message.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items.reverse()  # 按时间正序返回

    # 标记对方的消息为已读
    status = db.query(UserConversationStatus).filter(
        UserConversationStatus.user_id == user.id,
        UserConversationStatus.conversation_id == conv_id,
    ).first()
    if items:
        last_msg_id = max(m.id for m in items)
        if status:
            if not status.last_read_message_id or last_msg_id > status.last_read_message_id:
                status.last_read_message_id = last_msg_id
        else:
            status = UserConversationStatus(
                user_id=user.id,
                conversation_id=conv_id,
                last_read_message_id=last_msg_id,
            )
            db.add(status)

    # 标记消息为已读
    db.query(Message).filter(
        Message.conversation_id == conv_id,
        Message.sender_id != user.id,
        Message.is_read == False,
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()

    return MessageListResponse(
        total=total,
        items=[MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            sender_username=m.sender.username if m.sender else "已删除",
            sender_avatar=m.sender.avatar_url if m.sender else None,
            content=m.content,
            is_read=m.is_read,
            created_at=m.created_at,
        ) for m in items],
    )


@router.post("/messages", response_model=MessageResponse)
def send_message(
    data: SendMessageRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """发送私信"""
    if data.receiver_id == user.id:
        raise HTTPException(status_code=400, detail="不能给自己发消息")

    receiver = db.query(User).filter(User.id == data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="接收者不存在")

    conv = _get_or_create_conversation(db, user.id, data.receiver_id)

    msg = Message(
        conversation_id=conv.id,
        sender_id=user.id,
        content=data.content,
    )
    db.add(msg)
    db.flush()

    # 更新会话的最后消息信息
    conv.last_message_id = msg.id
    conv.last_message_at = msg.created_at

    # 给接收者发送通知（根据偏好过滤）
    if receiver.notify_messages:
        notification = Notification(
            user_id=receiver.id,
            type=NotificationType.MESSAGE,
            title=f"来自 {user.username} 的私信",
            content=data.content[:200],
            related_user_id=user.id,
            related_url=f"/conversations/{conv.id}",
        )
        db.add(notification)

    db.commit()
    db.refresh(msg)

    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender_username=user.username,
        sender_avatar=user.avatar_url,
        content=msg.content,
        is_read=msg.is_read,
        created_at=msg.created_at,
    )


@router.post("/conversations/with/{other_user_id}", response_model=dict)
def get_or_create_conversation_with_user(
    other_user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取或创建与指定用户的会话，返回会话ID"""
    other = db.query(User).filter(User.id == other_user_id).first()
    if not other:
        raise HTTPException(status_code=404, detail="用户不存在")
    if other_user_id == user.id:
        raise HTTPException(status_code=400, detail="不能和自己对话")

    conv = _get_or_create_conversation(db, user.id, other_user_id)
    # 确保当前用户的状态已创建（以防之前遗漏）
    status = db.query(UserConversationStatus).filter(
        UserConversationStatus.user_id == user.id,
        UserConversationStatus.conversation_id == conv.id,
    ).first()
    if not status:
        status = UserConversationStatus(user_id=user.id, conversation_id=conv.id)
        db.add(status)
    # 确保另一方也有状态
    other_status = db.query(UserConversationStatus).filter(
        UserConversationStatus.user_id == other_user_id,
        UserConversationStatus.conversation_id == conv.id,
    ).first()
    if not other_status:
        other_status = UserConversationStatus(user_id=other_user_id, conversation_id=conv.id)
        db.add(other_status)
    
    db.commit()
    return {"conversation_id": conv.id}


@router.get("/conversations/unread-count", response_model=dict)
def get_conversations_unread(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """只获取私信会话的未读总数"""
    convs = db.query(Conversation).filter(
        or_(Conversation.user1_id == user.id, Conversation.user2_id == user.id)
    ).all()

    total = 0
    for conv in convs:
        status = db.query(UserConversationStatus).filter(
            UserConversationStatus.user_id == user.id,
            UserConversationStatus.conversation_id == conv.id,
        ).first()
        if status and status.last_read_message_id:
            unread = db.query(Message).filter(
                Message.conversation_id == conv.id,
                Message.id > status.last_read_message_id,
                Message.sender_id != user.id,
            ).count()
        else:
            unread = db.query(Message).filter(
                Message.conversation_id == conv.id,
                Message.sender_id != user.id,
            ).count()
        total += unread

    return {"count": total}


@router.get("/users/{user_id}/mutual-follow", response_model=dict)
def check_mutual_follow(
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """检查当前用户与指定用户是否互相关注"""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")

    i_follow = db.query(Follow).filter(
        Follow.follower_id == user.id,
        Follow.following_id == user_id,
    ).first() is not None

    they_follow = db.query(Follow).filter(
        Follow.follower_id == user_id,
        Follow.following_id == user.id,
    ).first() is not None

    return {
        "is_mutual": i_follow and they_follow,
        "i_follow": i_follow,
        "they_follow": they_follow,
    }
