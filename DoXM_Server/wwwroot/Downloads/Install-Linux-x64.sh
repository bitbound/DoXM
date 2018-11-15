read -r -d '' doxmConfig << EOF
description "DoXM Client"
author      "Translucency"

start on filesystem or runlevel [2345]
stop on shutdown

script
    exec /usr/bin/DoXM/DoXM_Client

end script
EOF
$doxmConfig > /etc/init/doxm.conf