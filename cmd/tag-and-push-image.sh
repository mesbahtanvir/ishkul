####### run this script from root directory

docker build -t ishkul-react-app  ./web/ishkul-react-app 
docker tag ishkul-react-app mesbahtanvir/ishkul-react-app:latest # tag ishkul-react-app
docker push mesbahtanvir/ishkul-react-app:latest

docker build -t ishkul-contributor-app  ./web/ishkul-contributor-app 
docker tag ishkul-contributor-app mesbahtanvir/ishkul-contributor-app:latest # tag ishkul-contributor-app
docker push mesbahtanvir/ishkul-contributor-app:latest

docker build -t ishkul-backend  ./backend
docker tag ishkul-backend mesbahtanvir/ishkul-backend:latest  # tag ishkul-backend
docker push mesbahtanvir/ishkul-backend:latest

#sudo docker-compose -f ./infra/docker-compose.yml up 