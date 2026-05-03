import os
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
import joblib

def train_models():
    os.makedirs('models', exist_ok=True)
    
    # 1. Train on WELFake Dataset
    print("Loading WELFake Dataset...")
    try:
        welfake_df = pd.read_csv('../../dataset/WELFake_Dataset.csv').dropna(subset=['text', 'label'])
        # Limit to 50000 rows for speed
        welfake_df = welfake_df.sample(min(50000, len(welfake_df)), random_state=42)
        X_news = welfake_df['title'].fillna('') + ' ' + welfake_df['text']
        y_news = welfake_df['label']
        
        print("Training News Confidence Model...")
        news_pipeline = make_pipeline(
            TfidfVectorizer(max_features=10000, stop_words='english'),
            LogisticRegression(max_iter=1000, n_jobs=-1)
        )
        news_pipeline.fit(X_news, y_news)
        joblib.dump(news_pipeline, 'models/news_model.pkl')
        print("News Model saved to models/news_model.pkl")
    except Exception as e:
        print(f"Failed to train news model: {e}")

    # 2. Train on Tweets Dataset
    print("\nLoading Tweets Dataset...")
    try:
        tweets_df = pd.read_csv('../../dataset/tweets.csv').dropna(subset=['text', 'target'])
        X_tweets = tweets_df['text']
        y_tweets = tweets_df['target']
        
        print("Training Tweets Confidence Model...")
        tweet_pipeline = make_pipeline(
            TfidfVectorizer(max_features=5000, stop_words='english'),
            LogisticRegression(max_iter=1000, n_jobs=-1)
        )
        tweet_pipeline.fit(X_tweets, y_tweets)
        joblib.dump(tweet_pipeline, 'models/tweet_model.pkl')
        print("Tweet Model saved to models/tweet_model.pkl")
    except Exception as e:
        print(f"Failed to train tweet model: {e}")

if __name__ == '__main__':
    train_models()
