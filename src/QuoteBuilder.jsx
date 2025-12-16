import React from 'react'
import QuoteList from "./QuoteList";
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';

const IMG_BASE = import.meta.env.VITE_STAGING_IMG_URL;

export default function QuoteBuilder() {
    return (
        <>
            <Navbar>
            <Container>
                <Navbar.Brand href="#home">
                    <img
                        alt=""
                        src={IMG_BASE + "/fmipurple.png"}
                        className="d-inline-block align-top"
                    />{' '}
                </Navbar.Brand>
            </Container>
        </Navbar>
            <div><QuoteList /></div>
        </>
    )
}