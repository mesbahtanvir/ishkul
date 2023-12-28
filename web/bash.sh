npm install -g create-react-app # install create-react-app command
docker build -t ishkul-react-app ./ishkul-react-app # build docker image

# ishkul-common has been created
mkdir ishkul-common
cd ishkul-common
npm init
npm link

# from ishkul-react-app
npm link ishkul-common
