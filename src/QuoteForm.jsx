import React, { useState, useRef } from "react";
import AsyncSelect from "react-select/async";
import axios from "axios";
import { Container, Button, Row, Col, Form, Image } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const API_BASE = import.meta.env.VITE_STAGING_API_URL;
const IMG_BASE = import.meta.env.VITE_STAGING_IMG_URL;

export default function QuoteForm({userId,onQuoteSubmitted}) {

    const curenetUserId = userId;
    //console.log(userId);
    // ------------------------
    // Utility for empty row
    // ------------------------
    const makeEmptyRow = () => ({
        product: null, // selected product object
        tiers: [
            { options: [], selected: null, price: 0 },
            { options: [], selected: null, price: 0 },
            { options: [], selected: null, price: 0 },
        ],
        activeTier: null,
        lineTotal: 0,
        date_text: null,
    });

    // -------------------------
    // State
    // -------------------------
    const [rows, setRows] = useState(Array.from({ length: 5 }, makeEmptyRow));
    const [date, setDate] = useState(null);
    const dateRef = useRef(null);
    const controllerRef = useRef(null);

    // -------------------------
    // Helpers
    // -------------------------
    const formatDateForAPI = (d) => {
        if (!d) return "";
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
    };

    // -------------------------
    // SEARCH function per row
    // -------------------------
    // const searchProducts = async (inputValue) => {
    //     if (!inputValue || inputValue.length < 3) {
    //         return []; // No results until at least 3 characters
    //     }
    //
    //     if (!date) return [];
    //     const res = await axios.get(API_BASE + "/product_search", {
    //         params: {
    //             searchquery: inputValue,
    //             date_text: formatDateForAPI(date),
    //         },
    //     });
    //
    //     return res.data.map((p) => ({
    //         value: p.id,
    //         label: p.name,
    //         full: p,
    //     }));
    // };

    const searchProducts = async (inputValue) => {
        if (!inputValue || inputValue.length < 3) {
            return [];
        }

        if (!date) return [];

        // 🔹 Cancel previous request
        if (controllerRef.current) {
            controllerRef.current.abort();
        }

        // 🔹 Create new controller
        controllerRef.current = new AbortController();

        try {
            const res = await axios.get(API_BASE + "/product_search", {
                params: {
                    searchquery: inputValue,
                    date_text: formatDateForAPI(date),
                },
                signal: controllerRef.current.signal, // ← attach controller
            });

            return res.data.map((p) => ({
                value: p.id,
                label: p.name,
                full: p,
            }));

        } catch (err) {
            if (axios.isCancel(err)) {
                // Request was canceled → safe ignore
                return [];
            }
            console.error("API Error:", err);
            return [];
        }
    };

    // -------------------------
    // Product selection in row
    // -------------------------
    const handleProductSelect = (rowIndex, product) => {
        setRows((prev) => {
            const copy = prev.map((r, i) => ({ ...r, tiers: r.tiers.map(t => ({ ...t })) }));
            const row = copy[rowIndex];

            row.product = product;
            row.date_text = product.full?.date_text || null;

            const pd = product.full?.prices_data || [];

            // Build tiers
            for (let i = 0; i < 3; i++) {
                const tier = pd[i] || { stock_range_f: [], fob_price: 0 };
                const options = (tier.stock_range_f || []).map((q) => ({
                    label: q,
                    value: q,
                }));

                row.tiers[i] = {
                    options,
                    selected: null,
                    price: Number(tier.fob_price || 0),
                };
            }

            // Reset active tier + total
            row.activeTier = null;
            row.lineTotal = 0;

            return copy;
        });
    };

    // -------------------------
    // Tier selection change
    // ONLY last changed tier controls lineTotal
    // -------------------------
    const handleTierChange = (rowIndex, tierIndex, selected) => {
        setRows((prev) => {
            const copy = prev.map((r, i) => ({ ...r, tiers: r.tiers.map(t => ({ ...t })) }));
            const row = copy[rowIndex];

            const tier = row.tiers[tierIndex];
            tier.selected = selected ? Number(selected.value) : null;

            row.activeTier = tierIndex;

            if (tier.selected) {
                row.lineTotal = tier.selected * tier.price;
            } else {
                row.lineTotal = 0;
            }

            return copy;
        });
    };

    // -------------------------
    // Add row
    // -------------------------
    const addRow = () => {
        setRows((prev) => [...prev, makeEmptyRow()]);
    };

    // -------------------------
    // Remove row
    // -------------------------
    const removeRow = (index) => {
        setRows((prev) => {
            const copy = [...prev];
            copy.splice(index, 1);
            if (copy.length === 0) copy.push(makeEmptyRow());
            return copy;
        });
    };

    // -------------------------
    // Reset all rows when date changes
    // -------------------------
    const handleDateChange = (d) => {
        setDate(d);
        setRows(Array.from({ length: 5 }, () => makeEmptyRow())); // FIXED
    }
    // -------------------------
    // Final Total
    // -------------------------
    const finalTotal = rows.reduce((s, r) => s + (Number(r.lineTotal) || 0), 0);

    // -------------------------
    // Submit
    // -------------------------


    const submitQuote = async () => {
        try {
            const userId = curenetUserId; // <-- set your user ID variable
            const firstRow = rows.find(r => r.product);
            const shippingDate = firstRow ? firstRow.date_text : null;


            const payload = {
                shipping_date: shippingDate,
                user_id: userId,
                items: rows
                    .filter((r) => r.product)
                    .map((r) => ({
                        id: r.product.value,
                        name: r.product.label,
                        date_text: shippingDate,
                        active_tier: r.activeTier,
                        qty: r.activeTier !== null ? r.tiers[r.activeTier].selected : null,
                        fob_price: r.activeTier !== null ? r.tiers[r.activeTier].price : null,
                        line_total: r.lineTotal ?? 0,
                    })),
            };

            console.log("SUBMIT PAYLOAD:", payload);

            const response = await fetch(
                "https://wordpress-658092-2176352.cloudwaysapps.com/wp-json/quotebuilder_api/v1/submit_quotes",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json();
            console.log("API RESPONSE:", data);
            setRows(Array.from({ length: 5 }, makeEmptyRow));
            // success alert
            alert("Quote submitted successfully!");
            onQuoteSubmitted();


        } catch (error) {
            console.error("Submit Error:", error);
            alert("Something went wrong. Please try again.");
        }
    };
    // -------------------------
    // Highlight style (Option C)
    // -------------------------
    const highlightStyle = (isActive) => ({
        border: isActive ? "2px solid #0d6efd" : "1px solid #ced4da",
        borderRadius: "4px",
    });

    // ===============================================================
    // RENDER
    // ===============================================================
    return (
        <Container className="mt-4">
            <h4>Item List</h4>

            {/* DATE PICKER */}
            <Row className="mb-3">
                <Col md={6}>
                    <h5>Date: {date ? date.toDateString() : "Select a Date"}</h5>
                </Col>
                <Col md={6} className="text-end d-flex justify-content-end">
                    <h5 className="me-3">Select Ship Date</h5>
                    <DatePicker
                        ref={dateRef}
                        selected={date}
                        onChange={handleDateChange}
                        className="d-none"
                        minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
                        maxDate={new Date(new Date().setMonth(new Date().getMonth() + 3))}
                        filterDate={(d) => d.getDay() !== 0 && d.getDay() !== 6}
                    />
                    <Button variant="link" onClick={() => dateRef.current.setOpen(true)} className="date-picker-btn">
                        <Image src={IMG_BASE + "/schedule.png"} width={30} />
                    </Button>
                </Col>
            </Row>

            {/* ROWS */}
            {rows.map((row, i) => (
                <div key={i} className="border-bottom pb-3 mb-3">
                    <Row className="align-items-start">

                        {/* PRODUCT SEARCH */}
                        <Col md={4}>
                            <AsyncSelect
                                loadOptions={searchProducts}
                                onChange={(p) => handleProductSelect(i, p)}
                                value={row.product}
                                placeholder="Search product..."
                                isDisabled={!date}
                                defaultOptions
                            />
                        </Col>

                        {/* IMAGE */}
                        <Col md={2}>
                            {row.product?.full?.image ? (
                                <img
                                    src={row.product.full.image}
                                    style={{ width: 80, height: 80, objectFit: "contain" }}
                                />
                            ) : (
                                <div style={{ width: 80, height: 80, background: "#f3f3f3" }} />
                            )}
                        </Col>

                        {/* Tier dropdowns stacked */}
                        <Col md={3}>
                            {row.tiers.map((t, ti) =>
                                t.options.length > 0 ? (
                                    <div key={ti} className="mb-2">
                                        <Form.Select
                                            value={t.selected ?? ""}
                                            onChange={(e) =>
                                                handleTierChange(
                                                    i,
                                                    ti,
                                                    e.target.value
                                                        ? { value: e.target.value }
                                                        : null
                                                )
                                            }
                                            style={highlightStyle(row.activeTier === ti)}
                                        >
                                            <option value="">Qty</option>
                                            {t.options.map((op) => (
                                                <option key={op.value} value={op.value}>
                                                    {op.label}
                                                </option>
                                            ))}
                                        </Form.Select>
                                        {/*<div className="mt-1">Price: ${t.price.toFixed(2)}</div>*/}
                                    </div>
                                ) : null
                            )}
                        </Col>

                        {/* LINE TOTAL */}
                        <Col md={2}>
                            <strong>Line Total: ${row.lineTotal.toFixed(2)}</strong>
                        </Col>

                        {/* Remove */}
                        <Col md={1} className="text-end">
                            <Button className="fmi-removerow-quote" variant="link" onClick={() => removeRow(i)}>
                                ❌
                            </Button>
                        </Col>
                    </Row>
                </div>
            ))}

            {/* Add row / Total / Submit */}
            <Row className="mx-0 button_row_form" >
                <Col md={6}>
                    <Button onClick={addRow} className="fmi-addrow-quote">+ Add Row </Button>
                </Col>
                <Col md={6} className="text-end">
                    <h4>Total: ${finalTotal.toFixed(2)}</h4>
                    <Button
                        variant="primary"
                        disabled={finalTotal < 1000}
                        onClick={submitQuote}
                        className="fmi-submit-quote"
                    >
                        Submit Request (Min $1000)
                    </Button>
                </Col>
            </Row>
        </Container>
    );
}