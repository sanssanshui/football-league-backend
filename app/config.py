import os

class Config:
    """基础配置类，只保留数据库核心配置"""
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URI",
        "mysql+pymysql://root:root@localhost:3306/jiangsu_football_league?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    SECRET_KEY = os.getenv("SECRET_KEY", "football_secret_key_2025")
    DEBUG = False

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = True

class ProductionConfig(Config):
    DEBUG = False

config_dict = {
    "dev": DevelopmentConfig,
    "prod": ProductionConfig
}