wget -q https://packages.microsoft.com/config/ubuntu/18.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get install apt-transport-https
sudo apt-get update
sudo apt-get install dotnet-sdk-2.1
sudo apt-get install git

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

sudo npm install -g electron@2.0.10 --unsafe-perm=true --allow-root

sudo npm install -g typescript

sudo npm install -g electron-builder

cd $HOME/Desktop/Source/DoXM/DoXM_Remote_Control
