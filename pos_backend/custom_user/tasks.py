from django.conf import settings
from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from commonapp.email_service import send_email_with_db_config, create_email_message, send_email_message

login_url = f"{settings.FRONTEND_BASE_URL}/login"

@shared_task(queue="priority")
def send_account_credentials_email(to_email, username, email, password):
    subject = "Your Account Login Details"

    # Plain text version as fallback
    text_message = f"""
    Hi {username},

    Your account has been created successfully.
    Please use the following credentials to log in:

    Username: {username}
    Email: {email}
    Password: {password}

    It is recommended that you change your password upon first login.
    """

    # HTML version with better styling
    html_message = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Created</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333333;
                margin: 0;
                padding: 0;
                background-color: #f9f9f9;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background-color: #4F46E5;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
                margin-bottom: 20px;
            }}
            .header h1 {{
                color: white;
                margin: 0;
                font-size: 24px;
            }}
            .content {{
                padding: 0 20px;
            }}
            .credentials {{
                background-color: #f0f4ff;
                border-left: 4px solid #4F46E5;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .credentials p {{
                margin: 10px 0;
            }}
            .credentials strong {{
                display: inline-block;
                width: 100px;
                font-weight: 600;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eeeeee;
                color: #777777;
                font-size: 14px;
            }}
            .btn {{
                display: inline-block;
                background-color: #4F46E5;
                color: #ffffff !important; /* Ensuring text is white */
                text-decoration: none;
                padding: 12px 25px;
                border-radius: 4px;
                margin: 20px 0;
                font-weight: 500;
                font-size: 16px;
            }}
            .warning {{
                color: #e53e3e;
                font-size: 14px;
                margin-top: 15px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Account Created Successfully</h1>
            </div>
            <div class="content">
                <p>Hi <strong>{username}</strong>,</p>
                
                <p>Your account has been created successfully! Below are your login credentials:</p>
                
                <div class="credentials">
                    <p><strong>Username:</strong> {username}</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Password:</strong> {password}</p>
                </div>
                                
                <center>
                    <a href="{login_url}" class="btn" style="color: #ffffff;">Log In Now</a>
                </center>
                
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                
                <p>Thank you for joining us!</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 T Technologies INC. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Send email with both text and HTML versions
    email_message = create_email_message(
        subject=subject,
        body=text_message,
        to=[to_email],
        html_body=html_message
    )
    send_email_message(email_message)



@shared_task(queue='priority')
def send_password_reset_email_task(username, to_email, reset_link):
    subject = "Password Reset Request"

    # Render HTML content
    html_content = render_to_string(
        "emails/password_reset.html",
        {
            "username": username,
            "reset_link": reset_link,
            "company_name": "Your Company Name",
        },
    )

    # Fallback plain text
    text_content = (
        f"Hello {username},\n\n"
        f"We received a request to reset your password. If you didn't make this request, "
        f"you can safely ignore this email.\n\n"
        f"To reset your password, please visit the following link:\n{reset_link}\n\n"
        f"This link will expire in 24 hours for security reasons.\n\n"
        f"If you need any assistance, please contact our support team.\n\n"
        f"Best regards,\nThe Support Team"
    )

    # Use centralized email service
    send_email_with_db_config(
        subject=subject,
        message=text_content,
        recipient_list=[to_email],
        html_message=html_content
    )
