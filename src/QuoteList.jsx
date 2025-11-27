import React, { useEffect, useState } from "react";
import { Card, Button, Row, Col } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import QuoteForm from "./QuoteForm";

export default function QuoteList() {

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load API here
  useEffect(() => {
    async function loadQuotes() {
      try {
        // TODO: Replace with your real API URL
        // const res = await fetch("https://your-api.com/quotes");
        // const data = await res.json();

        // Temporary fake API data
        const data = [
          { quote_id: 101, user_id: 1, status: "Pending" },
          { quote_id: 102, user_id: 1, status: "Approved" },
          { quote_id: 103, user_id: 1, status: "Approved" },
          { quote_id: 104, user_id: 1, status: "Approved" },
          { quote_id: 105, user_id: 1, status: "Approved" },
          { quote_id: 106, user_id: 2, status: "Rejected" },
        ];

        setQuotes(data);
      } catch (error) {
        console.error("Error loading quotes:", error);
      } finally {
        setLoading(false);
      }
    }

    loadQuotes();
  }, []);

  const handleView = (item) => {
    console.log("View clicked:", item);
    // You can add React Router navigation here
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
      <QuoteForm/>
    </div>

    <div className="container mt-4">
      {quotes.map((item) => (
        <Card key={item.quote_id} className="mb-3 shadow-sm">
          <Card.Body>
            <Row className="align-items-center">
              {/* LEFT SIDE: QUOTE ID */}
              <Col>
                <h5 className="mb-0">Quote #{item.quote_id}</h5>
              </Col>

              {/* RIGHT SIDE: STATUS + VIEW BUTTON */}
              <Col className="text-end">
                <span className="badge bg-primary p-2">{item.status}</span>

                <Button
                  variant="success"
                  size="sm"
                  className="ms-3"
                  onClick={() => handleView(item)}
                >
                  View
                </Button>
              </Col>
            </Row>

            {/* HIDDEN FIELDS */}
            <input type="hidden" value={item.quote_id} />
            <input type="hidden" value={item.user_id} />
          </Card.Body>
        </Card>
      ))}
    </div>
  </>
  );
}