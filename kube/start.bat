kubectl delete secret -n aaas aaconfig
kubectl create secret -n aaas generic aaconfig --from-file=aaconf=secrets/config.json

kubectl delete -f frontend.yaml
kubectl create -f frontend.yaml