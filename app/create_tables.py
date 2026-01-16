import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ============ 核心修复：必须导入所有模型！！！ ============
from app.main import create_app
from app.extensions import db
# 导入所有数据表模型，让SQLAlchemy能扫描到并创建表
from app.models.user_model import User, UserCollection
from app.models.match_model import Team, Match, Player, Standing
from app.models.interaction_model import Comment, Vote, News, Guess

# 创建应用实例
app = create_app(config_name="dev")

# 创建所有数据表
with app.app_context():
    try:
        # 核心：创建所有模型对应的表
        db.create_all()
        print("✅✅✅ 所有数据表创建成功！包含：user/team/match/comment/player 等 ✅✅✅")
        print("✅ 数据表清单：team, user, match, player, standing, comment, vote, news, guess, user_collection")
    except Exception as e:
        print(f"❌ 建表失败：{str(e)}")