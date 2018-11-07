# Arguments are username, password, realm, SSL key password.
sudo apt-get update 
sudo apt-get upgrade 
sudo apt-get install -y dnsutils 
sudo apt-get install -y coturn
sudo rm -rf /var/lib/apt/lists/*

# Replace CN appropriately.
# sudo openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/turn_server_pkey.pem -out /etc/ssl/turn_server_cert.pem -days 365 -subj "/C=US/ST=Oregon/L=Keizer/O=Translucency/OU=DoXM/CN=my.doxm.app"

echo "TURNSERVER_ENABLED=1" | sudo tee /etc/default/coturn

echo "listening-port=3478
tls-listening-port=5349
realm=$3
server-name=$3
lt-cred-mech
cert=/etc/ssl/turn_server_cert.pem
pkey=/etc/ssl/turn_server_pkey.pem
pkey-pwd=$4
" | sudo tee /etc/turnserver.conf
 
 
sudo turnadmin -a -u $1 -p $2 -r $3

# Add an admin that will have access to the web console.  Server is located
# at https://[host/ip]:5349
#sudo turnadmin -A u doxm_admin -p mypassword