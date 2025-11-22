# app/config.py
class Config:
    """项目配置类：存储数据库、Redis、JWT 等配置信息"""
    # MySQL 配置（重点修改 password！）
    MYSQL_CONFIG = {
        "host": "localhost",          # 本地 MySQL 默认主机，无需修改（远程数据库才改）
        "user": "root",               # 本地 MySQL 默认用户名，99% 为 root，无需修改
        "password": "root",         # 🔴 关键修改：替换为你的 MySQL root 密码（安装时设置的）
        "database": "football_league",# 数据库名，阶段一已创建，无需修改
        "port": 3306,                 # MySQL 默认端口，未手动修改过则无需改
        "charset": "utf8mb4"          # 字符编码（支持表情、特殊字符），无需修改
    }
    # Redis 配置（预留，后续后端 C 补充，当前保持默认）
    REDIS_CONFIG = {
        "host": "localhost",
        "port": 6379,
        "db": 0,
        "password": ""  # 本地 Redis 默认无密码，有密码则填写实际密码
    }
    # JWT 配置（预留，后续后端 B 补充，当前保持默认）
    JWT_SECRET_KEY = "football_league_jwt_secret_2024"  # 自定义密钥，可修改为任意复杂字符串（如添加随机字符）