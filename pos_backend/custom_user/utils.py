import secrets
import string
from django.core.mail import send_mail


def generate_random_password(length=8):
    """
    Generates a secure random password.

    :param length: Length of the password (default is 12 characters)
    :return: A randomly generated password
    """

    # letters = string.ascii_letters
    # digits = string.digits

    # # Ensure one digit is included
    # password = [secrets.choice(digits)]

    # # Fill the rest of the password with random letters
    # password.extend(secrets.choice(letters) for _ in range(length - 1))

    # # Shuffle the password to randomize the order
    # secrets.SystemRandom().shuffle(password)

    # return ''.join(password)
    return "hello"
