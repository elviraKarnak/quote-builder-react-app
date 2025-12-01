import React, { useEffect, useState } from "react";
import { Card, Button, Row, Col } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import QuoteForm from "./QuoteForm";
import axios from "axios";
import QuoteDetailsModal from "./QuoteDetailsModal.jsx";

const API_BASE = import.meta.env.VITE_STAGING_API_URL;

export default function QuoteList() {

    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);

    const [selectedQuoteId, setSelectedQuoteId] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const WP_TIMEZONE_OFFSET = -5;

    function parseWPDate(dateString) {
        const d = new Date(dateString);

        // Convert WordPress local time → absolute UTC timestamp
        const utc = Date.UTC(
            d.getFullYear(),
            d.getMonth(),
            d.getDate(),
            d.getHours() - WP_TIMEZONE_OFFSET,
            d.getMinutes(),
            d.getSeconds()
        );

        return utc;
    }

    const [quoteloading, setquoteloading] = useState(false);

    const handleView = (item) => {

        setSelectedQuoteId(item.quote_id);
        setShowModal(true);
        console.log(item.quote_id);
    };



    async function updateQuoteStatus(quoteId, status) {
        try {
            await axios.post(
                API_BASE + "/update-status",
                {
                    quote_id: quoteId,
                    status: status,
                }
            );

            console.log("Status updated on server:", quoteId);
        } catch (error) {
            console.error("Failed to update quote status:", quoteId, error);
        }
    }


    const loadQuotes = async () => {
        try {
            console.log("Calling WP API...");

            setquoteloading(true);
            //
           //  const res = await fetch(
           //      `${window.wpApiSettings.root}quotebuilder_api/v1/load_user_data`,
           //      {
           //          method: "GET",
           //          credentials: "include",
           //          headers: {
           //              "X-WP-Nonce": window.wpApiSettings.nonce,
           //              "Content-Type": "application/json",
           //          },
           //      }
           //  );
           //
           // let userData = await res.json();
           //  console.log("API Response:", userData);


            //If user not logged in — stop
            // if (!userData.success) {
            //     console.warn("User not logged in");
            //     setQuotes([]);
            //     return;
            // }

             let userData = {message: "user logged In",
                                      success:true,
                                      user_id: 1}


            if (userData.success) {

                setUserId(userData.user_id);

                const response = await fetch(API_BASE + "/quotes?user_id="+userData.user_id);
                const json = await response.json();

                if (json.success && Array.isArray(json.quotes)) {

                    // Convert API quotes to your UI structure
                    const formattedQuotes = json.quotes.map((quote) => {

                        // total price = sum of item_price
                        const totalPrice = quote.items.reduce((sum, item) => {
                            return sum + Number(item.item_price || 0);
                        }, 0);

                        const startTime = parseWPDate(quote.start_date_time);
                        const expireTime = startTime + 24 * 60 * 60 * 1000; // +24 hours
                        const now = Date.now();


                        const timeLeft = Math.max(expireTime - now, 0);
                        const isExpired = timeLeft <= 0;

                        return {
                            quote_id: quote.quote_id,
                            shipping_date: quote.shipping_date,   // already in correct format
                            status: quote.quote_status,
                            total_price: totalPrice,
                            start_date_time: quote.start_date_time,
                            expireTime,
                            timeLeft,
                            isExpired,
                        };
                    });

                    setQuotes(formattedQuotes);  // Save into your state
                }

                console.log("Quote list:", quotes);
            }

        }
        catch
            (error)
        {
            console.error("Error loading quotes:", error);
        }
        finally
        {
            setquoteloading(false);
            setLoading(false);
        }
    }


    useEffect(() => {

            loadQuotes();

    }, []);

    useEffect(() => {
        const interval = setInterval(() => {

            setQuotes((prevQuotes) =>
                prevQuotes.map((q) => {
                    const now = Date.now();
                    const timeLeft = Math.max(q.expireTime - now, 0);
                    const isExpired = timeLeft <= 0;

                    return {
                        ...q,
                        timeLeft,
                        isExpired: isExpired,
                        status: isExpired ? "expired" : q.status,
                    };
                })
            );

        }, 1000); // updates every second

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let updated = false;

        const newQuotes = quotes.map((q) => {
            if (q.isExpired && q.status == "processing") {

                    updateQuoteStatus(q.quote_id, 'expired');

                    updated = true;   // mark that we need to update state
                    return { ...q, status: "expired" };

            }
            return q;
        });

        if (updated) {
            setQuotes(newQuotes);
        }
    }, [quotes]);

    const formatCountdown = (ms) => {
        const totalSec = Math.floor(ms / 1000);
        const hrs = String(Math.floor(totalSec / 3600)).padStart(2, "0");
        const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
        const secs = String(totalSec % 60).padStart(2, "0");

        return `${hrs}:${mins}:${secs}`;
    };

    
    const formatDate = (dateString) => {
        const d = new Date(dateString);
        if (isNaN(d)) return "";

        const day = String(d.getDate()).padStart(2, "0");

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const month = months[d.getMonth()];
        const year = d.getFullYear();

        return `${day}-${month}-${year}`;
    };

    if (loading) {
        return (
            <div className="text-center mt-5">
                <h5>Loading quotes...</h5>
            </div>
        );
    }

    return (
        <>
            <div className="container mt-4">
                <QuoteForm userId={userId} onQuoteSubmitted={loadQuotes} />
            </div>

            <div className="container mt-4">
                {quoteloading ? (
                    <div className="quote-list-loader">
                        <span className="spinner"></span>
                    </div>
                ) : (
                  <>
                  {quotes.map((item) => (
                    <Card key={item.quote_id} className="mb-3 shadow-sm">
                        <Card.Body>
                            <Row className="align-items-center">

                                <Col md={6} className="quote-strip-header">
                                    <h5 className="mb-0">Quote #{item.quote_id}</h5>
                                    <p className="shiping-date">Ship Date: {formatDate(item.shipping_date)}</p>
                                </Col>

                                <Col md={6} className="quote-strip-footer">
                                    <p className="total-price">Total:{parseFloat(item.total_price).toFixed(2)}</p>

                                       <p className="countdown">
                                           {item.isExpired
                                               ? ""
                                               : "Time Left: " + formatCountdown(item.timeLeft)}
                                       </p>
                                       <span className={`badge mode-${item.status} p-2`}>{item.status}</span>

                                    <Button
                                        variant="success"
                                        size="sm"
                                        className="ms-3"
                                        disabled={item.isExpired}
                                        onClick={() => !item.isExpired && handleView(item)}
                                    >
                                        View
                                    </Button>
                                </Col>

                            </Row>

                            <input type="hidden" value={item.quote_id} />
                            <input type="hidden" value={item.user_id} />
                        </Card.Body>
                    </Card>
                ))}
                    <QuoteDetailsModal
                    show={showModal}
                    quoteId={selectedQuoteId}
                    userId={userId}
                    onHide={() => setShowModal(false)}
                    />
                  </>
                )}
            </div>
        </>
    );
}