from celery import Celery
from asgiref.sync import async_to_sync
from .mail import create_message, mail
import requests
import time

c_app = Celery()
c_app.config_from_object("src.utils.config")


# @c_app.task()
# def send_email(email_recipients: list[str], subject: str, html: str):
async def send_email(email_recipients: list[str], subject: str, html: str):
    '''
    Send emails using celery tasks
    '''
    message = create_message(
        recipients=email_recipients,
        subject=subject,
        body=html
    )
    await mail.send_message(message)
    # async_to_sync(mail.send_message)(message)


@c_app.task()
def long_task(webhook_url: str):
    time.sleep(5) # simulate long running task

    payload = {"status": "completed", "result": "Task finished successfully"}
    try:
        requests.post(webhook_url, json=payload)
    except Exception as e:
        print(f"Webhook failed: {e}")