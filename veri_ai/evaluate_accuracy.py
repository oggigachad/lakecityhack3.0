import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.metrics import accuracy_score

def evaluate():
    print("Evaluating News Model (WELFake Dataset)...")
    try:
        welfake_df = pd.read_csv('../../dataset/WELFake_Dataset.csv').dropna(subset=['text', 'label'])
        welfake_df = welfake_df.sample(min(50000, len(welfake_df)), random_state=42)
        X_news = welfake_df['title'].fillna('') + ' ' + welfake_df['text']
        y_news = welfake_df['label']
        
        X_train, X_test, y_train, y_test = train_test_split(X_news, y_news, test_size=0.2, random_state=42)
        news_pipeline = make_pipeline(
            TfidfVectorizer(max_features=10000, stop_words='english'),
            LogisticRegression(max_iter=1000, n_jobs=-1)
        )
        news_pipeline.fit(X_train, y_train)
        news_acc = accuracy_score(y_test, news_pipeline.predict(X_test))
        print(f"News Model Accuracy: {news_acc:.4f} ({news_acc*100:.2f}%)")
    except Exception as e:
        print(f"Failed to evaluate news model: {e}")

    print("\nEvaluating Tweet Model (Tweets Dataset)...")
    try:
        tweets_df = pd.read_csv('../../dataset/tweets.csv').dropna(subset=['text', 'target'])
        X_tweets = tweets_df['text']
        y_tweets = tweets_df['target']
        
        X_train, X_test, y_train, y_test = train_test_split(X_tweets, y_tweets, test_size=0.2, random_state=42)
        tweet_pipeline = make_pipeline(
            TfidfVectorizer(max_features=5000, stop_words='english'),
            LogisticRegression(max_iter=1000, n_jobs=-1)
        )
        tweet_pipeline.fit(X_train, y_train)
        tweet_acc = accuracy_score(y_test, tweet_pipeline.predict(X_test))
        print(f"Tweet Model Accuracy: {tweet_acc:.4f} ({tweet_acc*100:.2f}%)")
    except Exception as e:
        print(f"Failed to evaluate tweet model: {e}")

if __name__ == '__main__':
    evaluate()
