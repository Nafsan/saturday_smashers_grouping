import React, { useState, useEffect, useRef } from 'react';
import './NewsSection.scss';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const NewsSection = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const autoPlayRef = useRef(null);
    const ITEMS_PER_SLIDE = 3;

    useEffect(() => {
        fetchNews();
    }, []);

    useEffect(() => {
        // Auto-play carousel if more than 3 items
        if (news.length > 3) {
            autoPlayRef.current = setInterval(() => {
                setCurrentIndex((prev) => {
                    const maxIndex = Math.ceil(news.length / ITEMS_PER_SLIDE) - 1;
                    return (prev + 1) > maxIndex ? 0 : prev + 1;
                });
            }, 5000); // Change slide every 5 seconds

            return () => {
                if (autoPlayRef.current) {
                    clearInterval(autoPlayRef.current);
                }
            };
        }
    }, [news.length]);

    const fetchNews = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            console.log("Fetching news from:", `${API_URL}/news/`);
            const response = await fetch(`${API_URL}/news/`);
            if (response.ok) {
                const data = await response.json();
                setNews(data);
            } else {
                console.error("News fetch response not ok", response.status);
            }
        } catch (error) {
            console.error("Failed to fetch news", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevious = () => {
        const maxIndex = Math.ceil(news.length / ITEMS_PER_SLIDE) - 1;
        setCurrentIndex((prev) => (prev - 1 < 0 ? maxIndex : prev - 1));
        // Reset auto-play timer
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = setInterval(() => {
                setCurrentIndex((prev) => {
                    const maxIdx = Math.ceil(news.length / ITEMS_PER_SLIDE) - 1;
                    return (prev + 1) > maxIdx ? 0 : prev + 1;
                });
            }, 5000);
        }
    };

    const handleNext = () => {
        const maxIndex = Math.ceil(news.length / ITEMS_PER_SLIDE) - 1;
        setCurrentIndex((prev) => (prev + 1) > maxIndex ? 0 : prev + 1);
        // Reset auto-play timer
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = setInterval(() => {
                setCurrentIndex((prev) => {
                    const maxIdx = Math.ceil(news.length / ITEMS_PER_SLIDE) - 1;
                    return (prev + 1) > maxIdx ? 0 : prev + 1;
                });
            }, 5000);
        }
    };

    if (loading) return null;

    const renderNewsCard = (item) => (
        <article key={item.id} className="news-card">
            {item.image_urls && item.image_urls.length > 0 ? (
                <div className="image-gallery">
                    <img
                        src={item.image_urls[0].startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${item.image_urls[0]}` : item.image_urls[0]}
                        alt={item.title}
                        onError={(e) => { e.target.style.display = 'none' }}
                    />
                    {item.image_urls.length > 1 && (
                        <div className="gallery-indicator">+{item.image_urls.length - 1}</div>
                    )}
                </div>
            ) : null}
            <div className="news-content">
                <h3>{item.title}</h3>
                <span className="date">
                    <Calendar size={14} />
                    {new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <p>{item.description}</p>
            </div>
        </article>
    );

    // Group news into slides of 3 items each
    const groupedNews = [];
    for (let i = 0; i < news.length; i += ITEMS_PER_SLIDE) {
        groupedNews.push(news.slice(i, i + ITEMS_PER_SLIDE));
    }

    const totalSlides = Math.ceil(news.length / ITEMS_PER_SLIDE);

    return (
        <section className="news-section container">
            <h2>🏆 Hall of Fame & News</h2>
            {news.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '12px' }}>
                    <p>No news updates yet. Check back soon!</p>
                </div>
            ) : news.length > 3 ? (
                <div className="news-carousel">
                    <button className="carousel-arrow carousel-arrow-left" onClick={handlePrevious} aria-label="Previous news">
                        <ChevronLeft size={32} />
                    </button>
                    <div className="carousel-track">
                        <div
                            className="carousel-items"
                            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                        >
                            {groupedNews.map((group, slideIndex) => (
                                <div key={slideIndex} className="carousel-slide">
                                    <div className="news-grid">
                                        {group.map((item) => renderNewsCard(item))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button className="carousel-arrow carousel-arrow-right" onClick={handleNext} aria-label="Next news">
                        <ChevronRight size={32} />
                    </button>
                    <div className="carousel-indicators">
                        {Array.from({ length: totalSlides }).map((_, index) => (
                            <button
                                key={index}
                                className={`indicator ${index === currentIndex ? 'active' : ''}`}
                                onClick={() => setCurrentIndex(index)}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="news-grid">
                    {news.map((item) => renderNewsCard(item))}
                </div>
            )}
        </section>
    );
};

export default NewsSection;
