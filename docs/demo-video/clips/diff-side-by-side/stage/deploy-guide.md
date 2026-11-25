# Deploy guide

Deploy on Wednesday morning, after the nightly build and the smoke tests are green.

1. Run the database migrations.
2. Restart the workers two at a time.
3. Watch the error rate for thirty minutes.

Roll back by redeploying the previous tag.
