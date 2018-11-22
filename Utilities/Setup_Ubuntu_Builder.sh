wget -q https://packages.microsoft.com/config/ubuntu/18.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get install apt-transport-https
sudo apt-get update
sudo apt-get install dotnet-sdk-2.1
sudo apt-get install git

sudo add-apt-repository universe

cd ~/Desktop
git clone https://github.com/Jay-Rad/DoXM.git

cd ~/Downloads
wget -qO- https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo apt-get install libxtst-dev libpng++-dev

sudo apt-get install gcc

sudo apt-get install python2.7

sudo apt-get install make

sudo apt-get install g++

sudo apt-get install wine-stable

sudo npm install -g electron --unsafe-perm=true --allow-root

sudo npm install -g typescript

sudo npm install -g electron-builder