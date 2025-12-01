import React, { useEffect, useState } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import axios from "axios";

const API_BASE = import.meta.env.VITE_STAGING_API_URL;

export default function QuoteDetailsModal({ show, quoteId, onHide,userId }) {
    const [loading, setLoading] = useState(true);
    const [quote, setQuote] = useState(null);

    useEffect(() => {
        if (!quoteId || !show) return;

        async function fetchQuote() {
            setLoading(true);
            try {
                const res = await axios.get(API_BASE + "/quotes?user_id="+userId+"&quote_id="+quoteId);
                if (res.data.success) {
                    console.log(res.data.quotes[0]);
                    setQuote(res.data.quotes[0]);
                }
            } catch (err) {
                console.error("Error fetching quote details:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchQuote();

    }, [quoteId, show]);

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


    return (
        <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>Quote #{quoteId}</Modal.Title>
            </Modal.Header>

            <Modal.Body style={{ minHeight: "200px" }}>
                {loading && (
                    <div className="text-center py-5">
                        <Spinner animation="border" />
                    </div>
                )}

                {!loading && quote &&(
                    <>
                        <p><strong>Status:</strong> <span className={`badge mode-${quote.quote_status} p-2`}>{quote.quote_status}</span></p>
                        <p><strong>Ship Date:</strong> {formatDate(quote.shipping_date)}</p>


                        <h5 className="mt-3 mb-3">Items</h5>

                        <table className="table table-bordered table-striped">
                            <thead>
                            <tr>
                                <th>Item Name</th>
                                <th className="text-center">Qty</th>
                                <th className="text-end">Price</th>
                                <th className="text-end">Total Price</th>
                                <th className="text-end">Quote Price</th>
                            </tr>
                            </thead>
                            <tbody>
                            {quote.items?.map((item) => {
                                const qty = Number(item.item_quantity || 0);
                                const price = Number(item.item_price || 0);
                                const total = qty * price;

                                return (
                                    <tr key={item.id}>
                                        <td>{item.item_name}</td>
                                        <td className="text-center">{qty}</td>
                                        <td className="text-end">${price.toFixed(2)}</td>
                                        <td className="text-end">${total.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                );
                            })}


                            </tbody>
                        </table>
                        <div className="btn_add_wrap  w-100">
                            <Button className="mt-4 float-end" variant="primary">Add To Cart</Button>
                        </div>
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
}