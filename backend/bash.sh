pip3 install venv # install venv
python3 -m venv venv # create virtual environment
source venv/bin/activate # activate virtual environment of python
pip3 install -r requirements.txt # install all requirements

docker build -t ishkul-backend . # build docker image