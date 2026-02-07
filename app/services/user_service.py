import sys
from pathlib import Path
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))

from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from app.models.user_model import User, UserCollection
from app.models.match_model import Match
from app.utils.jwt_utils import create_token
from app.utils.content_filter import filter_sensitive_words  # 敏感词过滤（已有工具类）
from datetime import datetime

class UserService:
    @staticmethod
    def register_user(db: Session, username: str, password: str, phone: Optional[str] = None) -> Dict[str, Any]:
        """
        用户注册
        :param db: 数据库会话
        :param username: 用户名（唯一）
        :param password: 原始密码（需加密）
        :param phone: 手机号（可选，用于后续扩展）
        :return: 注册结果（含用户信息）
        """
        # 1. 校验用户名是否已存在
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            raise ValueError("用户名已被注册")
        
        # 2. 敏感词过滤（用户名）
        if filter_sensitive_words(username):
            raise ValueError("用户名包含敏感词")
        
        # 3. 创建用户并加密密码
        new_user = User(
            username=username,
            create_time=datetime.now(),
            update_time=datetime.now()
        )
        new_user.set_password(password)  # 密码加密存储
        
        # 4. 保存到数据库
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # 5. 返回用户信息（隐藏密码）
        return {
            "user_id": new_user.id,
            "username": new_user.username,
            "score": new_user.score,
            "create_time": new_user.create_time.strftime("%Y-%m-%d %H:%M:%S")
        }

    @staticmethod
    def login_user(db: Session, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        用户登录（验证密码并生成Token）
        :param db: 数据库会话
        :param username: 用户名
        :param password: 原始密码
        :return: 登录结果（含Token）
        """
        # 1. 查询用户
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return None
        
        # 2. 验证密码
        if not user.check_password(password):
            return None
        
        # 3. 生成JWT Token
        token = create_token(user.id, expire_hours=24)
        
        # 4. 更新最后登录时间（扩展字段，若需添加可在User模型中增加last_login_time）
        user.update_time = datetime.now()
        db.commit()
        
        return {
            "user_id": user.id,
            "username": user.username,
            "token": token,
            "expire_seconds": 24 * 3600,
            "avatar_url": user.avatar_url or ""
        }

    @staticmethod
    def get_user_info(db: Session, user_id: int) -> Optional[Dict[str, Any]]:
        """
        查询用户个人信息
        :param db: 数据库会话
        :param user_id: 用户ID（从Token解析）
        :return: 用户详情
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        return {
            "user_id": user.id,
            "username": user.username,
            "focus_teams": user.get_focus_teams(),  # 解析为球队ID列表
            "score": user.score,
            "avatar_url": user.avatar_url or "",
            "create_time": user.create_time.strftime("%Y-%m-%d %H:%M:%S")
        }

    @staticmethod
    def update_user_info(db: Session, user_id: int, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        修改用户个人信息（支持头像、关注球队）
        :param db: 数据库会话
        :param user_id: 用户ID
        :param update_data: 更新数据（avatar_url/focus_teams）
        :return: 更新后的用户信息
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        # 1. 更新头像（可选）
        if "avatar_url" in update_data and update_data["avatar_url"]:
            user.avatar_url = update_data["avatar_url"]
        
        # 2. 更新关注球队（可选）
        if "focus_team_id" in update_data and update_data["focus_team_id"]:
            team_id = int(update_data["focus_team_id"])
            is_add = update_data.get("is_add", True)
            user.update_focus_teams(team_id, is_add)
        
        # 3. 更新时间
        user.update_time = datetime.now()
        db.commit()
        db.refresh(user)
        
        return UserService.get_user_info(db, user_id)

    @staticmethod
    def collect_match(db: Session, user_id: int, match_id: int) -> Dict[str, Any]:
        """
        收藏赛事（防止重复收藏）
        :param db: 数据库会话
        :param user_id: 用户ID
        :param match_id: 赛事ID
        :return: 收藏结果
        """
        # 1. 校验赛事是否存在
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise ValueError("赛事不存在")
        
        # 2. 校验是否已收藏
        existing_collection = db.query(UserCollection).filter(
            UserCollection.user_id == user_id,
            UserCollection.match_id == match_id
        ).first()
        if existing_collection:
            raise ValueError("已收藏该赛事")
        
        # 3. 创建收藏记录
        new_collection = UserCollection(
            user_id=user_id,
            match_id=match_id,
            create_time=datetime.now()
        )
        db.add(new_collection)
        db.commit()
        
        return {"status": "success", "message": "收藏成功", "collection_id": new_collection.id}

    @staticmethod
    def get_collect_list(db: Session, user_id: int, page: int = 1, page_size: int = 10) -> Dict[str, Any]:
        """
        查询用户收藏的赛事列表（分页）
        :param db: 数据库会话
        :param user_id: 用户ID
        :param page: 页码（默认第1页）
        :param page_size: 每页条数（默认10条）
        :return: 分页后的收藏列表
        """
        # 1. 计算偏移量
        offset = (page - 1) * page_size
        
        # 2. 查询收藏记录（关联赛事详情）
        collections = db.query(UserCollection, Match).join(
            Match, UserCollection.match_id == Match.id
        ).filter(
            UserCollection.user_id == user_id
        ).order_by(
            UserCollection.create_time.desc()
        ).limit(page_size).offset(offset).all()
        
        # 3. 统计总条数
        total = db.query(UserCollection).filter(UserCollection.user_id == user_id).count()
        
        # 4. 格式化结果
        collect_list = []
        for coll, match in collections:
            collect_list.append({
                "collection_id": coll.id,
                "match_id": match.id,
                "home_team": match.home_team.name if match.home_team else "",
                "away_team": match.away_team.name if match.away_team else "",
                "match_time": match.match_time.strftime("%Y-%m-%d %H:%M:%S"),
                "venue": match.venue or "",
                "home_score": match.home_score,
                "away_score": match.away_score,
                "status": match.status,
                "collect_time": coll.create_time.strftime("%Y-%m-%d %H:%M:%S")
            })
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "list": collect_list
        }

    @staticmethod
    def cancel_collect(db: Session, user_id: int, collection_id: Optional[int] = None, match_id: Optional[int] = None) -> Dict[str, Any]:
        """
        取消收藏（支持通过收藏ID或赛事ID取消）
        :param db: 数据库会话
        :param user_id: 用户ID
        :param collection_id: 收藏ID（二选一）
        :param match_id: 赛事ID（二选一）
        :return: 取消结果
        """
        if not collection_id and not match_id:
            raise ValueError("请提供收藏ID或赛事ID")
        
        # 构建查询条件
        query = db.query(UserCollection).filter(UserCollection.user_id == user_id)
        if collection_id:
            query = query.filter(UserCollection.id == collection_id)
        if match_id:
            query = query.filter(UserCollection.match_id == match_id)
        
        collection = query.first()
        if not collection:
            raise ValueError("收藏记录不存在")
        
        # 删除收藏记录
        db.delete(collection)
        db.commit()
        
        return {"status": "success", "message": "取消收藏成功"}

# 实例化服务类（供路由调用）
user_service = UserService()