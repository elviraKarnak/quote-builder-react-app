import React, { useState, useEffect, useRef } from "react";
import AsyncSelect from "react-select/async";
import axios from "axios";
import { Container, Button, Row, Table, Modal, Col, Form, Image } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Fuse from "fuse.js";


const API_BASE = import.meta.env.VITE_STAGING_API_URL;
const IMG_BASE = import.meta.env.VITE_STAGING_IMG_URL;

export default function QuoteForm({userId,onQuoteSubmitted, shippingId}) {

    const curenetUserId = userId;
    //console.log(userId);
    // ------------------------
    // Utility for empty row
    // ------------------------
    // const makeEmptyRow = () => ({
    //     product: null, // selected product object
    //     tiers: [
    //         { options: [], selected: null, price: 0 },
    //         { options: [], selected: null, price: 0 },
    //         { options: [], selected: null, price: 0 },
    //     ],
    //     activeTier: null,
    //     lineTotal: 0,
    //     date_text: null,
    // });

    const makeEmptyRow = () => ({
        product: null,
        tiers: [
            { options: [], price: 0 },
            { options: [], price: 0 },
            { options: [], price: 0 },
        ],
        qty: "",               // ✅ ADD THIS
        activeTier: null,
        lineTotal: 0,
        date_text: null,
    });

    // -------------------------
    // State
    // -------------------------


    const [allProducts, setAllProducts] = useState([]);


    const [productsLoading, setProductsLoading] = useState(false);


    const [fuse, setFuse] = useState(null);

    // product search modal
    const [showProductModal, setShowProductModal] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null);

    // modal search
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);


    const [rows, setRows] = useState(Array.from({ length: 5 }, makeEmptyRow));
    const [date, setDate] = useState(null);
    const dateRef = useRef(null);
    const controllerRef = useRef(null);

    const [showShippingModal, setShowShippingModal] = useState(false);
    const [shippingData, setShippingData] = useState(null);
    const [selectedShipping, setSelectedShipping] = useState(null);
    const [triggerPrice, setTriggerPrice] = useState(null);

    // -------------------------
    // Effects
    // -------------------------


    useEffect(() => {
        if (!date) return;

        const loadProducts = async () => {
            setProductsLoading(true);
            try {
                const res = await axios.get(API_BASE + "/product_search", {
                    params: {
                        date_text: formatDateForAPI(date),
                        model: "fob", // if required
                        user_id: userId,
                    },
                });

                const formatted = res.data.map(p => ({
                    value: p.id,
                    label: p.name,
                    unit: p.unit,
                    image: p.image,
                    full: p,
                }));

                setAllProducts(formatted);

                console.log(formatted);

                setFuse(
                    new Fuse(formatted, {
                        keys: ["label"],
                        threshold: 0.35,        // lower = stricter
                        ignoreLocation: true,
                        minMatchCharLength: 2,
                    })
                );
            } catch (err) {
                console.error("Product load error:", err);
                setAllProducts([]);
            } finally {
                setProductsLoading(false);
            }
        };

        loadProducts();
    }, [date]);

    useEffect(() => {
        if (!triggerPrice) return; // if no price yet, don't call API

        const getShipping = async () => {
            try {
                const response = await axios.get(
                    API_BASE+ "/shipping-methods",
                    {
                        params: {
                            user_id: userId,
                            quote_total: triggerPrice,
                        },
                    }
                );

                setShippingData(response.data);
            } catch (error) {
                console.error("Shipping API error:", error);
            }
        };

        getShipping();
    }, [triggerPrice]); // <-- runs when final price is set





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

    const openProductModal = (rowIndex) => {
        setActiveRowIndex(rowIndex);
        setShowProductModal(true);
        setSearchTerm("");
        setSearchResults([]);
    };

    const handleModalSearch = (value) => {
        setSearchTerm(value);

        if (!value || !fuse) {
            setSearchResults([]);
            return;
        }

        const results = fuse.search(value).map(r => r.item);
        setSearchResults(results);
    };

    const selectProductFromModal = (product) => {
        if (activeRowIndex === null) return;

        handleProductSelect(activeRowIndex, product);

        setShowProductModal(false);
        setActiveRowIndex(null);
    };

    const resolveTierByQty = (tiers, qty) => {
        if (!qty || qty < 1 || !tiers?.length) return null;

        const q = Number(qty);

        // Build normalized tier list
        const parsedTiers = tiers
            .map((tier, index) => {
                if (!tier.options?.length) return null;

                // Extract max value from ranges
                const maxValues = tier.options
                    .map(opt => opt.value)
                    .map(val => {
                        if (typeof val === "string" && val.includes("-")) {
                            return Number(val.split("-")[1]);
                        }
                        return Number(val);
                    })
                    .filter(v => !isNaN(v));

                if (!maxValues.length) return null;

                return {
                    index,
                    max: Math.max(...maxValues),
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.max - b.max);

        if (!parsedTiers.length) return null;

        // Find first tier where qty <= max
        const matched = parsedTiers.find(t => q <= t.max);

        // If qty exceeds all ranges → use LAST tier
        return matched ? matched.index : parsedTiers[parsedTiers.length - 1].index;
    };

    const handleQtyChange = (rowIndex, value) => {
        setRows((prev) =>
            prev.map((r, i) => {
                if (i !== rowIndex) return r;

                const tierIndex = resolveTierByQty(r.tiers, value);

                return {
                    ...r,
                    qty: value,
                    activeTier: tierIndex,
                    lineTotal:
                        tierIndex !== null
                            ? Number(value) * r.tiers[tierIndex].price
                            : 0,
                };
            })
        );
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

    // const searchProducts = async (inputValue) => {
    //     if (!inputValue || inputValue.length < 3) {
    //         return [];
    //     }
    //
    //     if (!date) return [];
    //
    //     // 🔹 Cancel previous request
    //     if (controllerRef.current) {
    //         controllerRef.current.abort();
    //     }
    //
    //     // 🔹 Create new controller
    //     controllerRef.current = new AbortController();
    //
    //     try {
    //         const res = await axios.get(API_BASE + "/product_search", {
    //             params: {
    //                 searchquery: inputValue,
    //                 date_text: formatDateForAPI(date),
    //             },
    //             signal: controllerRef.current.signal, // ← attach controller
    //         });
    //
    //         return res.data.map((p) => ({
    //             value: p.id,
    //             label: p.name,
    //             full: p,
    //         }));
    //
    //     } catch (err) {
    //         if (axios.isCancel(err)) {
    //             // Request was canceled → safe ignore
    //             return [];
    //         }
    //         console.error("API Error:", err);
    //         return [];
    //     }
    // };


    // -------------------------
    // Product selection in row
    // -------------------------


    const handleProductSelect = (rowIndex, product) => {
        setRows(prev => {
            const copy = prev.map(r => ({
                ...r,
                tiers: r.tiers.map(t => ({ ...t })),
            }));

            const row = copy[rowIndex];
            row.product = product;
            row.date_text = product.full?.date_text || null;

            const pd = product.full?.prices_data || [];

            for (let i = 0; i < 3; i++) {
                const tier = pd[i] || { stock_range_f: [], fob_price: 0 };
                row.tiers[i] = {
                    options: (tier.stock_range_f || []).map(q => ({
                        label: q,
                        value: q,
                    })),
                    price: Number(tier.fob_price || 0),
                };
            }

            // 🔁 RE-APPLY QTY IF USER ALREADY TYPED
            if (row.qty) {
                const tierIndex = resolveTierByQty(row.tiers, row.qty);
                row.activeTier = tierIndex;
                row.lineTotal =
                    tierIndex !== null
                        ? Number(row.qty) * row.tiers[tierIndex].price
                        : 0;
            } else {
                row.activeTier = null;
                row.lineTotal = 0;
            }

            return copy;
        });
    };

    // -------------------------
    // Tier selection change
    // ONLY last changed tier controls lineTotal
    // -------------------------
    // const handleTierChange = (rowIndex, tierIndex, selected) => {
    //     setRows((prev) => {
    //         const copy = prev.map((r, i) => ({ ...r, tiers: r.tiers.map(t => ({ ...t })) }));
    //         const row = copy[rowIndex];
    //
    //         const tier = row.tiers[tierIndex];
    //         tier.selected = selected ? Number(selected.value) : null;
    //
    //         row.activeTier = tierIndex;
    //
    //         if (tier.selected) {
    //             row.lineTotal = tier.selected * tier.price;
    //         } else {
    //             row.lineTotal = 0;
    //         }
    //
    //         return copy;
    //     });
    // };

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
        setProductsLoading(true);            // 👈 FORCE loader immediately
        setAllProducts([]);
        setFuse(null);
    }
    // -------------------------
    // Final Total
    // -------------------------
    const finalTotal = rows.reduce((s, r) => s + (Number(r.lineTotal) || 0), 0);

    // -------------------------
    // Submit
    // -------------------------


    const submitQuote = async (selectedShipping) => {
        try {
            const userId = curenetUserId; // <-- set your user ID variable
            const firstRow = rows.find(r => r.product);
            const shippingDate = firstRow ? firstRow.date_text : null;

            //
            // const payload = {
            //     shipping_date: shippingDate,
            //     user_id: userId,
            //     shipping_address_id:shippingId,
            //     shipping_method:selectedShipping.id,
            //     // items: rows
            //     //     .filter((r) => r.product)
            //     //     .map((r) => ({
            //     //         id: r.product.value,
            //     //         name: r.product.label,
            //     //         date_text: shippingDate,
            //     //         active_tier: r.activeTier,
            //     //         qty: r.activeTier !== null ? r.tiers[r.activeTier].selected : null,
            //     //         fob_price: r.activeTier !== null ? r.tiers[r.activeTier].price : null,
            //     //         line_total: r.lineTotal ?? 0,
            //     //     })),
            //     items: rows
            //         .filter((r) => r.product && Number(r.qty) > 0)
            //         .map((r) => ({
            //             product_id: r.product.value,
            //             product_name: r.product.label,
            //             unit: r.product.unit,                 // ✅ NEW
            //             qty: Number(r.qty),                   // ✅ FIXED
            //             active_tier: r.activeTier,             // optional but useful
            //             fob_price:
            //                 r.activeTier !== null
            //                     ? r.tiers[r.activeTier].price
            //                     : 0,
            //             line_total: r.lineTotal,
            //         })),
            // };


            const payload = {
                shipping_date: shippingDate,
                user_id: userId,
                shipping_address_id: shippingId,
                shipping_method: selectedShipping.id,
                items: rows
                    .filter(r => r.product && Number(r.qty) > 0)
                    .map(r => ({
                        id: r.product.value,
                        name: r.product.label,
                        date_text: shippingDate,
                        active_tier: r.activeTier,
                        qty: Number(r.qty),
                        fob_price:
                            r.activeTier !== null
                                ? r.tiers[r.activeTier].price
                                : 0,
                        line_total: r.lineTotal
                    }))
            };


            console.log("SUBMIT PAYLOAD:", payload);

            //return;

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
    // const highlightStyle = (isActive) => ({
    //     border: isActive ? "2px solid #0d6efd" : "1px solid #ced4da",
    //     borderRadius: "4px",
    // });

    const openShippingModal = () => {
        setTriggerPrice(finalTotal); // this triggers useEffect()
        setShowShippingModal(true);
    };



    // ===============================================================
    // RENDER
    // ===============================================================
    return (
        <>
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

            <Table bordered responsive>
                <thead>
                <tr>
                    <th style={{ width: "40%" }}>Product</th>
                    <th style={{ width: "10%" }}>UOM</th>
                    <th style={{ width: "30%" }}>Qty</th>
                    {/*<th style={{ width: "15%" }}>Unit Price</th>*/}
                    <th style={{ width: "15%" }}>Line Total</th>
                    <th style={{ width: "5%" }}></th>
                </tr>
                </thead>

                <tbody>
                {productsLoading ? (
                    <tr>
                        <td colSpan={6} className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <div className="mt-2">Loading products…</div>
                        </td>
                    </tr>
                ) : (
                rows.map((row, i) => (
                    <tr key={i}>
                        {/* PRODUCT CELL */}
                        <td
                            onClick={() => {
                                if (!productsLoading) openProductModal(i);
                            }}
                            style={{
                                pointerEvents: (productsLoading || !date) ? "none" : "pointer",
                                opacity: (productsLoading || !date) ? 0.5 : 1,
                            }}
                        >
                      <span>
                        <img
                            src={row.product?.image || IMG_BASE + "/insert-picture-icon.png"}
                            alt={row.product?.label}
                            width={row.product ? 100 : 32}
                            className="pe-3"
                        />
                      </span>
                            {row.product ? row.product.label : "Search product"}
                        </td>
                        {/* UOM */}
                        <td>{row.product?.unit || "-"}</td>

                        {/* QTY INPUT (TEXT FIELD) */}
                        <td>
                            <Form.Control
                                type="number"
                                min="0"
                                placeholder="Qty"
                                value={row.qty}
                                onChange={(e) =>
                                    handleQtyChange(i, e.target.value)
                                }
                                disabled={!row.product || productsLoading}
                            />
                        </td>

                        {/* UNIT PRICE */}
                        {/*<td>*/}
                        {/*    $*/}
                        {/*    {row.activeTier !== null*/}
                        {/*        ? row.tiers[row.activeTier].price.toFixed(2)*/}
                        {/*        : "0.00"}*/}
                        {/*</td>*/}

                        {/* LINE TOTAL */}
                        <td>
                            <strong>${row.lineTotal.toFixed(2)}</strong>
                        </td>

                        {/* REMOVE */}
                        <td className="text-end">
                            <Button
                                variant="link"
                                onClick={() => removeRow(i)}
                            >
                                ❌
                            </Button>
                        </td>
                    </tr>
                ))
                )}
                </tbody>
            </Table>

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
                        onClick={openShippingModal}
                        className="fmi-submit-quote"
                    >
                        Submit Request (Min $1000)
                    </Button>
                </Col>
            </Row>
        </Container>
        <Modal show={showShippingModal} onHide={() => setShowShippingModal(false)} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Select Shipping Method</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {!shippingData ? (
                    <p>Loading shipping options...</p>
                ) : (
                    <>
                        {/* FedEx Section */}
                        <h5 className="mb-3">Delivery Method</h5>

                        {["fedex", "fedex_second"].map(key => {
                            const item = shippingData[key];
                            return (
                                <div className="d-flex justify-content-between mb-2" key={item.slug}>
                                    <div>
                                        <input
                                            type="radio"
                                            id={item.slug}
                                            name="shipping"
                                            value={item.slug}
                                            onChange={() => setSelectedShipping(item)}
                                        />
                                        <label for={item.slug} className="ms-2">{item.name}</label>
                                    </div>
                                    <strong>${item.shippingPercentage}</strong>
                                </div>
                            );
                        })}

                        {/* Airlines */}
                        <h5 className="mt-4">Airlines</h5>
                        {shippingData.airline.map(item => (
                            <div className="d-flex justify-content-between mb-2" key={item.id}>
                                <div>
                                    <input
                                        type="radio"
                                        id={item.id}
                                        name="shipping"
                                        value={item.slug}
                                        onChange={() => setSelectedShipping(item)}
                                    />
                                    <label className="ms-2" for={item.id}>{item.name}</label>
                                </div>

                                <strong>${(item.shippingPercentage).toFixed(2)}</strong>
                            </div>
                        ))}

                        {/* Trucking Lines */}
                        <h5 className="mt-4">Trucking Lines</h5>
                        {shippingData.truckline.map(item => (
                            <div className="d-flex justify-content-between mb-3" key={item.id}>
                                <div>
                                    <input
                                        type="radio"
                                        id={item.id}
                                        name="shipping"
                                        value={item.slug}
                                        onChange={() => setSelectedShipping(item)}
                                    />
                                    <label for={item.id} className="ms-2">{item.name}</label>
                                </div>

                                <strong>${(item.shippingPercentage).toFixed(2)}</strong>
                            </div>
                        ))}
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary fmi-submit-quote" onClick={() => setShowShippingModal(false)}>
                    Cancel
                </Button>

                <Button
                    variant="primary fmi-submit-quote"
                    disabled={!selectedShipping}
                    onClick={() => {
                        console.log(selectedShipping);
                        submitQuote(selectedShipping);
                        setShowShippingModal(false);
                    }}
                >
                    Confirm & Submit
                </Button>
            </Modal.Footer>
        </Modal>

            <Modal
                show={showProductModal}
                onHide={() => setShowProductModal(false)}
                size="xl"
                centered
            >
                <Modal.Header closeButton>
                    <Form.Control
                        placeholder="Search products"
                        value={searchTerm}
                        onChange={(e) => handleModalSearch(e.target.value)}
                        autoFocus
                    />
                </Modal.Header>

                <Modal.Body>
                    <Row>
                        {/* LEFT SUGGESTIONS */}
                        <Col md={3}>
                            <h6>Top Suggestions</h6>
                            {searchResults.slice(0, 6).map((p, i) => (
                                <div
                                    key={i}
                                    onClick={() => selectProductFromModal(p)}
                                >
                                    {p.label}
                                </div>
                            ))}
                        </Col>

                        {/* RIGHT PRODUCT GRID */}
                        <Col md={9}>
                            <Row>
                                {searchResults.map((p) => (
                                    <Col md={4} key={p.value}>
                                        <div
                                            onClick={() => selectProductFromModal(p)}
                                        >
                                            {p.full?.image && (
                                                <img
                                                    src={p.full.image}
                                                    style={{ width: "100%", height: 150, objectFit: "contain" }}
                                                />
                                            )}
                                            <div>{p.label}</div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </Col>
                    </Row>
                </Modal.Body>
            </Modal>
        </>
    );
}