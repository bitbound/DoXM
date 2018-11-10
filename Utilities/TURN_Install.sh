# Arguments are username, password, realm.
sudo apt-get update 
sudo apt-get upgrade 
sudo apt-get install -y coturn
sudo rm -rf /var/lib/apt/lists/*

echo "TURNSERVER_ENABLED=1" | sudo tee /etc/default/coturn

echo "listening-port=3478
realm=$3
server-name=$3
lt-cred-mech
" | sudo tee /etc/turnserver.conf
 
sudo turnadmin -a -u $1 -p $2 -r $3