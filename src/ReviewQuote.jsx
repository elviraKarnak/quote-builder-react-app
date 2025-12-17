import { React, useMemo } from "react";
const IMG_BASE = import.meta.env.VITE_STAGING_IMG_URL;

export default function ReviewQuote({quoteId,shipDate, shipData, shippingMethodName, items, subTotal, discountPercent, discountAmount, grandTotal,}) {

    const validDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);

        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    }, []);

    return (
        <>
        <div className="quote-review">

            {/* HEADER */}
            <div className="quote-header">
                <img
                    src={IMG_BASE + "/fmipurple.png"}
                    alt="FMI Logo"
                    className="quote-logo"
                />
                <h1 className="quote-title">Quotation Request</h1>
            </div>

            {/* META */}
            <div className="quote-meta">
                <strong>Quote #</strong> {quoteId} |{" "}
                <strong>Quote Date:</strong> {shipDate} |{" "}
                <strong>Valid until Date:</strong> {validDate}
            </div>

            {/* SHIPPING INFO */}
            <div className="quote-shipping">
                <div className="ship-to">
                    <strong>Ship To:</strong>
                    <div>{shipData.shipping_company}</div>
                    <div>{shipData.shipping_address_1}</div>
                    <div>
                        {shipData.shipping_city}, {shipData.shipping_state}{" "}
                        {shipData.shipping_postcode}
                    </div>
                </div>

                <div className="ship-method">
                    <strong>Shipping Method:</strong>
                    <div>{shippingMethodName}</div>
                </div>
            </div>

            {/* ITEMS TABLE */}
            <table className="quote-items">
                <thead>
                <tr>
                    <th>Item Description</th>
                    <th>UOM</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
                </thead>
                <tbody>
                {items.map((item, i) => (
                    <tr key={i}>
                        <td>{item.name}</td>
                        <td>{item.uom}</td>
                        <td>{item.qty}</td>
                        <td>${item.unit_price.toFixed(2)}</td>
                        <td>${item.line_total.toFixed(2)}</td>
                    </tr>
                ))}
                </tbody>
            </table>

            {/* TERMS + TOTALS */}
            <div className="quote-footer">
                <div className="quote-terms">
                    <h4>Terms and Conditions</h4>
                    <p>
                        Valid for 26 hours; prices and availability may change after
                        expiration.<br />
                        Checkout required to confirm and secure product.<br />
                        Perishables may vary; claims allowed within 3–4 shipping days.<br />
                        Must meet $1,000 wholesale minimum to process the order.
                    </p>
                </div>

                <div className="quote-totals">
                    <div className="total-row">
                        <span>Sub Total</span>
                        <span>${subTotal.toFixed(2)}</span>
                    </div>

                    <div className="total-row">
                        <span>Discount ({discountPercent}%)</span>
                        <span>- ${discountAmount.toFixed(2)}</span>
                    </div>

                    <div className="total-row grand-total">
                        <span>Grand Total</span>
                        <span>${grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

        </div>
        </>
    );
}
