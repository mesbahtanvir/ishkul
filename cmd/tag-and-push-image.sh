####### run this script from root directory

docker build -t web-www ./web/www
docker tag web-www mesbahtanvir/web-www:latest # tag web-www
docker push mesbahtanvir/web-www:latest

docker build -t web-app ./web/app
docker tag web-app mesbahtanvir/web-app:latest # tag web-app
docker push mesbahtanvir/web-app:latest

docker build -t ishkul-backend ./backend
docker tag ishkul-backend mesbahtanvir/ishkul-backend:latest  # tag ishkul-backend
docker push mesbahtanvir/ishkul-backend:latest

#sudo docker-compose -f ./infra/docker-compose.yml up 