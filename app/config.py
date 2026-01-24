import os
class Config:
    """基础配置类，只保留数据库核心配置"""
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URI",
        "mysql+pymysql://root:wingsFeig@localhost:3306/jiangsu_football_league?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    SECRET_KEY = os.getenv("SECRET_KEY", "football_secret_key_2025")
    DEBUG = False
    
    REDIS_CONFIG = {
        "host": "localhost",
        "port": 6379,
        "db": 0,
        "password": ""  # 本地Redis默认无密码
    }

    MYSQL_CONFIG = {
        "host": "localhost",
        "user": "root",
        "password": "wingsFeig",  # 本地MySQL root密码
        "database": "jiangsu_football_league",
        "port": 3306,
        "charset": "utf8mb4"
    }

    # JWT配置(预留,后续由后端B补充)
    JWT_SECRET_KEY = "football_league_jwt_secret_2024"  # 自定义密钥

    REDIS_CONFIG = {
        "host": os.getenv("REDIS_HOST", "redis-13294.c16.us-east-1-3.ec2.cloud.redislabs.com"),
        "port": int(os.getenv("REDIS_PORT", 13294)),
         "username": os.getenv("REDIS_USERNAME", "default"),
        "password": os.getenv("REDIS_PASSWORD","3pGhZQm0aV0drgNM1p0wi5DqYHaYy1WM"),
        "decode_responses": True
    }
    MYSQL_CONFIG = {
        "host": "localhost",
        "user": "root",
        "password": "123456",  # 本地MySQL root密码
        "database": "jiangsu_football_league",
        "port": 3306,
        "charset": "utf8mb4"
    }
    JWT_SECRET_KEY = "football_league_jwt_secret_2024"

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = True

class ProductionConfig(Config):
    DEBUG = False

config_dict = {
    "dev": DevelopmentConfig,
    "prod": ProductionConfig
}