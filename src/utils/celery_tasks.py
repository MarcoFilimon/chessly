from celery import Celery
from asgiref.sync import async_to_sync
from .mail import create_message, mail

c_app = Celery()
c_app.config_from_object("src.config")


@c_app.task()
def send_email(email_recipients: list[str], subject: str, html: str):
    '''
    Send emails using celery tasks
    '''
    message = create_message(
        recipients=email_recipients,
        subject=subject,
        body=html
    )
    async_to_sync(mail.send_message)(message)