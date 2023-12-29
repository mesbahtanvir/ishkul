####### run this script from root directory

docker build -t ishkul-web  ./ui/ishkul-web
docker tag ishkul-web mesbahtanvir/ishkul-web:latest # tag ishkul-web
docker push mesbahtanvir/ishkul-web:latest

docker build -t ishkul-app  ./ui/ishkul-app 
docker tag ishkul-app mesbahtanvir/ishkul-app:latest # tag ishkul-app
docker push mesbahtanvir/ishkul-app:latest

docker build -t ishkul-backend  ./backend
docker tag ishkul-backend mesbahtanvir/ishkul-backend:latest  # tag ishkul-backend
docker push mesbahtanvir/ishkul-backend:latest

#sudo docker-compose -f ./infra/docker-compose.yml up 