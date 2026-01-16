import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

"""
from app.main import create_app
from app.extensions import db
from app.models.user_model import User
from app.models.match_model import Team
"""

from main import create_app
from extensions import db
from models.user_model import User
from models.match_model import Team

app = create_app(config_name="dev")

with app.app_context():
    print("======= 数据库测试开始 =======")
    try:
        # 1. 新增测试数据
        print("\n【1】新增数据 >>>")
        test_user = User(
            username="test_user02",
            openid="wx_test002",
            focus_teams="1",
            score=80,
            avatar_url="https://example.com/avatar02.jpg"
        )
        test_user.set_password("test123")

        test_team = Team(
            name="南京队",
            city="南京",
            logo_url="https://example.com/nanjing_logo.png"
        )

        db.session.add_all([test_user, test_team])
        db.session.commit()
        print("✅ 用户、球队新增成功")

        # 2. 查询测试
        print("\n【2】查询数据 >>>")
        query_user = User.query.filter_by(username="test_user02").first()
        query_team = Team.query.filter_by(city="南京").first()
        print(f"✅ 用户：{query_user.username}，积分：{query_user.score}")
        print(f"✅ 球队：{query_team.name}，城市：{query_team.city}")

        # 3. 密码验证
        print("\n【3】密码验证 >>>")
        pwd_ok = test_user.check_password("test123")
        pwd_err = test_user.check_password("wrongpwd")
        print(f"✅ 正确密码验证结果：{pwd_ok}")
        print(f"✅ 错误密码验证结果：{pwd_err}")

        # 4. 数据更新
        print("\n【4】更新数据 >>>")
        query_user.score = 200
        db.session.commit()
        print(f"✅ 用户积分更新成功，最新积分：{query_user.score}")

        # 5. 清理测试数据
        print("\n【5】清理数据 >>>")
        db.session.delete(test_user)
        db.session.delete(test_team)
        db.session.commit()
        print("✅ 测试数据已清理完成")

        print("\n======= ✅✅✅ 数据库测试全部通过！所有功能正常！✅✅✅ =======")

    except Exception as e:
        db.session.rollback()
        print(f"\n❌ 测试失败：{str(e)}")