"""Product recommendations from browsing history (fictional)."""
import joblib
from sklearn.neighbors import NearestNeighbors

model = joblib.load("models/recommender.joblib")


def recommend(product_vector):
    return model.kneighbors([product_vector], n_neighbors=5)
