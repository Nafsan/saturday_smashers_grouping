import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NewsSection from './NewsSection';
import ThemeToggle from './ThemeToggle';
import './NewsPage.scss';

const NewsPage = () => {
    const navigate = useNavigate();

    return (
        <div className="news-page">
            <ThemeToggle />
            <div className="news-header">
                <div className="header-content">
                    <button className="back-btn" onClick={() => navigate('/')}>
                        <ArrowLeft size={20} />
                        Back to Home
                    </button>
                    <h1 className="news-title">Hall of Fame & News</h1>
                    <div style={{ width: '150px' }}></div>
                </div>
            </div>
            <NewsSection />
        </div>
    );
};

export default NewsPage;
