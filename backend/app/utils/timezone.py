from datetime import datetime, timezone, timedelta
from typing import Optional, Union

# Indian Standard Time (IST): UTC+05:30
IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now() -> datetime:
    """Return timezone-aware current datetime in IST (UTC+05:30)."""
    return datetime.now(IST)

def get_ist_time() -> datetime:
    """
    Return current datetime in Indian Standard Time (IST) as naive datetime.
    Used for database column defaults and records so the stored timestamps
    accurately reflect Indian Time.
    """
    return datetime.now(IST).replace(tzinfo=None)

def to_ist(dt: Optional[datetime] = None) -> datetime:
    """
    Convert any datetime (aware or naive) to IST.
    If naive, assumes UTC and converts to IST.
    If None, returns current IST datetime.
    """
    if dt is None:
        return get_ist_time()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST).replace(tzinfo=None)

def format_ist_datetime(dt: Optional[datetime], fmt: str = "%d-%m-%Y %I:%M:%S %p") -> Optional[str]:
    """Format datetime into standard Indian format (e.g. 20-09-2026 12:30:00 PM)."""
    if not dt:
        return None
    return dt.strftime(fmt)

def format_ist_date(dt: Optional[Union[datetime, str]], fmt: str = "%d-%m-%Y") -> Optional[str]:
    """Format date into standard Indian date format (DD-MM-YYYY)."""
    if not dt:
        return None
    if isinstance(dt, datetime):
        return dt.strftime(fmt)
    return str(dt)
