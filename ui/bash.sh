npm install -g create-react-app # install create-react-app command
docker build -t ishkul-web ./ishkul-web # build docker image

# ishkul-common has been created
mkdir ishkul-common
cd ishkul-common
npm init
npm link

# from ishkul-web
npm link ishkul-common


# nextui installation

npm i @nextui-org/react framer-motion
