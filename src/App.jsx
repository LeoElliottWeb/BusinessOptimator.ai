import React from 'react';
import homeGif from './home.gif';

export default function RadioStation() {
    return (
        <div
            style={{
                display: 'flex',
                minHeight: '100vh',
                backgroundColor: '#030511',
                margin: 0,
                fontFamily: 'Segoe UI, sans-serif',
            }}
        >
            {/* LEFT SIDEBAR: Links */}
            <div
                style={{
                    width: '250px',
                    padding: '40px 20px',
                    backgroundColor: '#030511',
                    borderRight: '1px solid #1a1c2e',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                }}
            >
                <h2 style={{ color: '#ffffff', fontSize: '1.2rem', marginTop: 0, marginBottom: '10px' }}>
                    Our Projects
                </h2>
                <a
                    href="https://splendorous-cupcake-ea4c80.netlify.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: '#58a6ff',
                        textDecoration: 'none',
                        fontSize: '1.1rem',
                    }}
                >
                    Estate agents
                </a>
                <a
                    href="https://totalrecall.network/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: '#58a6ff',
                        textDecoration: 'none',
                        fontSize: '1.1rem',
                    }}
                >
                    TotalRecall
                </a>
            </div>

            {/* RIGHT SIDE: Main Content */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    padding: '40px 20px',
                    boxSizing: 'border-box',
                }}
            >
                <h1
                    style={{
                        color: '#ffffff',
                        fontSize: '2rem',
                        textAlign: 'center',
                        marginBottom: '40px',
                        marginTop: '0',
                    }}
                >
                    Optimize your business with AI and make more money
                </h1>

                <img
                    src={homeGif}
                    alt="home"
                    style={{
                        width: '50%',
                        maxHeight: '50vh',
                        objectFit: 'contain',
                    }}
                />

                <p
                    style={{
                        color: '#ffffff',
                        fontSize: '1.2rem',
                        textAlign: 'center',
                        marginTop: '30px',
                    }}
                >
                    We can analyse your business processes and automate them
                </p>
            </div>
        </div>
    );
}