import os
from vndb import scheduler
from functools import wraps

def crawl_task(minute=0):
    """Decorator for data-crawl jobs, restricted to an off-peak time window.

    Crawling competes with users for the VNDB Kana API rate limit, so it is
    confined to the quiet hours given by the CRAWL_HOURS env var (a cron hour
    expression, e.g. '3-6'), interpreted in SCHEDULER_TIMEZONE. The job still
    runs once per hour, but only within that window.

    :param minute: Minute of the hour (0-59)
    """
    hours = os.environ.get('CRAWL_HOURS', '3-6')
    def decorator(func):
        @wraps(func)
        @scheduler.task(trigger='cron', id=f'crawl_{func.__name__}',
                        hour=hours, minute=minute,
                        max_instances=1, coalesce=True)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator

def daily_task(hour=0, minute=0):
    """
    Decorator for tasks that should run daily at a specific time.

    :param hour: Hour of the day (0-23)
    :param minute: Minute of the hour (0-59)
    """
    def decorator(func):
        @wraps(func)
        @scheduler.task(trigger='cron', id=f'daily_{func.__name__}', hour=hour, minute=minute)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator

def weekly_task(day_of_week=0, hour=0, minute=0):
    """
    Decorator for tasks that should run weekly on a specific day and time.

    :param day_of_week: Day of the week (0-6, where 0 is Monday)
    :param hour: Hour of the day (0-23)
    :param minute: Minute of the hour (0-59)
    """
    def decorator(func):
        @wraps(func)
        @scheduler.task(trigger='cron', id=f'weekly_{func.__name__}', day_of_week=day_of_week, hour=hour, minute=minute)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator

def monthly_task(day=1, hour=0, minute=0):
    """
    Decorator for tasks that should run monthly on a specific day and time.

    :param day: Day of the month (1-31)
    :param hour: Hour of the day (0-23)
    :param minute: Minute of the hour (0-59)
    """
    def decorator(func):
        @wraps(func)
        @scheduler.task(trigger='cron', id=f'monthly_{func.__name__}', day=day, hour=hour, minute=minute)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator

def hourly_task(minute=0):
    """
    Decorator for tasks that should run every hour at a specific minute.

    :param minute: Minute of the hour (0-59)
    """
    def decorator(func):
        @wraps(func)
        @scheduler.task(trigger='cron', id=f'hourly_{func.__name__}', minute=minute)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator

def custom_interval_task(minutes=0, hours=0, days=0):
    """
    Decorator for tasks that should run at custom intervals.

    :param minutes: Number of minutes between runs
    :param hours: Number of hours between runs
    :param days: Number of days between runs
    """
    def decorator(func):
        @wraps(func)
        @scheduler.task(trigger='interval', id=f'interval_{func.__name__}', minutes=minutes, hours=hours, days=days)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator

def workday_task(hour=9, minute=0):
    """
    Decorator for tasks that should run every workday (Monday to Friday) at a specific time.

    :param hour: Hour of the day (0-23)
    :param minute: Minute of the hour (0-59)
    """
    def decorator(func):
        @wraps(func)
        @scheduler.task(trigger='cron', id=f'workday_{func.__name__}', day_of_week='mon-fri', hour=hour, minute=minute)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator

def test_task(func):
    """
    Decorator for test tasks that should run every 10 seconds.
    """
    @wraps(func)
    @scheduler.task(trigger='interval', id=f'test_{func.__name__}', seconds=10, max_instances=1)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper