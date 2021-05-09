#!/bin/bash

source venv/scripts/activate
cd backend
python manage.py runworker user_action
