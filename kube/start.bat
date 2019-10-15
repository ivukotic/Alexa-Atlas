kubectl delete secret -n aaas config
kubectl create secret -n aaas generic config --from-file=aaconf=secrets/config.json
kubectl delete -f frontend
kubectl create -f frontend.yaml