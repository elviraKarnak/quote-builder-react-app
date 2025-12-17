import React from 'react'
import QuoteList from "./QuoteList";
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import {Row, Col} from "react-bootstrap";

const IMG_BASE = import.meta.env.VITE_STAGING_IMG_URL;
const BASE_URL = import.meta.env.VITE_STAGING_URL;

export default function QuoteBuilder() {
    return (
        <div className="fmi-quote-builder-body-wraper">
            <Navbar>
                <Container className="p-0">
                    <Row className="w-100 align-items-center justify-content-between">
                        <Col md={6}>
                            <Navbar.Brand href="#home">
                                <img
                                    alt=""
                                    src={IMG_BASE + "/fmipurple.png"}
                                    className="d-inline-block align-top"
                                />{' '}
                            </Navbar.Brand>
                        </Col>
                        <Col md={6} className="d-flex align-items-center justify-content-end p-0">
                            <a href={BASE_URL} className="btn btn-large back-to-home-btn">Back to Home</a>
                        </Col>
                    </Row>
                </Container>
            </Navbar>
            <div className="fmi-quote-builder-wraper">
                <div className="requset-qt-h">
                    <h1>Request A Quote</h1>
                </div>
                <QuoteList />
            </div>
        </div>
    )
}