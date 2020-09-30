# Walmart Receipt Splitter #

This is an app for splitting Walmart receipts. I use it with my roommates to pay each other back for groceries. Note that it is intended for personal use only. The passwords and Django secret key are not secured whatsoever.

## Setup ##
Once you've cloned the repository, the root directory should contain the following:
```
- backend/
- client/
- receipt_parser/
- venv/
- .gitignore
```

In a terminal in the `venv` directory, run:
```
python3 -m venv .
source scripts/activate
pip3 install -r requirements.txt
```

All further commands should only be done in terminals that have sourced `venv/scripts/activate`.

In a terminal in the `client` directory, run:
```
npm install
```

In a terminal in the `backend` directory, run:
```
python3 manage.py makemigrations cost_claimer
python3 manage.py migrate
python3 manage.py createsuperuser
```

If the 3rd line gives an error about the command not being ran in a TTY, try `winpty python3 manage.py createsuperuser`.

In the same terminal, run:
```
python3 manage.py runserver 0.0.0.0:8000
```

In your browser, go to [http://localhost:8000/admin/](http://localhost:8000/admin/) and login using the superuser details. Click the "Users" entry under "COST_CLAIMER" and create a new user for every person who will be splitting things.

Finally, you will need a working version of Redis set up using Docker. I like the [Docker Dashboard](https://www.docker.com/products/docker-desktop); more user information [here](https://docs.docker.com/desktop/dashboard/). In a terminal, run:
```
docker run -p 6379:6379 -d redis:5
```

## Running ##

Reminder: Make sure all terminals are sourced to `venv/scripts/activate` and that Redis is already running.

In a terminal in the backend directory, run:
```
python3 manage.py runserver 0.0.0.0:8000
```

In another terminal in the `backend` directory, run:
```
python3 manage.py runworker user_action
```

Make sure to start the worker command after the server is running or it won't be able to connect.

In a terminal in the `client` directory, run:
```
npm start
```

Now you should be able to connect to the frontend on port 3000. Alternatively, you could run `npm build` then `npx serve` and join on port 5000 instead of using the development version.

## Adding Receipts ##

You can download receipts using [Walmart's Receipt Lookup Tool](https://www.walmart.com/receipt-lookup). Save the page in the `receipt_parser` folder named the date the receipt was on formatted YYYY-MM-DD. While the Django server is running, in a terminal in the `receipt_parser` directory, run:
```
python3 ReceiptParser.py YYYY-MM-DD
```
where YYYY-MM-DD is the page you downloaded. You will be asked for who paid for the receipt and the tax status of every item. When looking at the receipt (you can also download a pdf from the lookup tool too), an item is not taxed if it has an N or O at the end of the line. An X or T means it is taxed. Some items like clothing have a slightly lower tax rate compared to most other taxed items, but are still treated as if they were taxed at the normal rate.

## Reviewing a Receipt ##

In the frontend application, you can join a lobby for any receipt that has already been uploaded. Join using the same YYYY-MM-DD name. After, each person's share is shown. Receipt's can be re-reviewed to change the proportionate shares. The balance tab shows the net total of all the receipts per person.
