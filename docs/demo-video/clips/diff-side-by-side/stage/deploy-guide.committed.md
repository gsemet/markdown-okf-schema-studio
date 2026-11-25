# Deploy guide

Deploy on Tuesday morning, after the nightly build is green.

1. Run the database migrations.
2. Restart the workers one at a time.
3. Watch the error rate for ten minutes.

Roll back by redeploying the previous tag.
