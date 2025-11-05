celery -A pos_backend worker --pool=solo --loglevel=info -Q priority


celery -A pos_backend worker --pool=solo --loglevel=info -Q default


celery -A pos_backend beat --loglevel=info


Production

sudo docker compose -f docker-compose-prod.yml up --build