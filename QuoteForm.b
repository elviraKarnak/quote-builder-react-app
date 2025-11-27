import React, { useState, useRef  } from "react";
import AsyncSelect from "react-select/async";
import axios from "axios";
import { Container, Button, Row, Col, Form, Image  } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const API_BASE = import.meta.env.VITE_STAGING_API_URL;
const IMG_BASE = import.meta.env.VITE_STAGING_IMG_URL;

export default function QuoteForm() {
  const [rows, setRows] = useState(
    Array(5).fill({ item: null, qty: 1 }) // default 5 rows
  );

  const [date, setDate] = useState(null);
  const [dateSelected, setdateSelected] = useState(false);
  const dateRef = useRef(null);

  const formatDateForAPI = (d) => {
  if (!d) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};


//   const loadOptions = async (inputValue) => {
//   const res = await axios.get("/api/search-items", {
//     params: { 
//       q: inputValue,
//       date: date ? date.toISOString().split("T")[0] : null   // add date here
//     },
//   });

//   return res.data.map((i) => ({
//     value: i.id,
//     label: i.name
//   }));
// };

  const loadOptions = async (inputValue) => {

  const formattedDate = formatDateForAPI(date);

  const res = await axios.get(
    API_BASE +"/product_search",
    {
      params: {
        searchquery: inputValue,
        date_text: formattedDate,
      },
    }
  );

  return res.data.map((item) => ({
    value: item.id,
    label: item.name,
    date_text: item.date_text,
    full: item,
  }));
};


    const getQtyOptions = (item) => {
        if (!item || !item.full || !item.full.prices_data) return [];

        let options = [];

        item.full.prices_data.forEach((tier) => {
            tier.stock_range_f.forEach((qty) => {
                options.push({
                    label: `${qty} pcs`,
                    value: qty,
                    price: Number(tier.fob_price), // correct price
                    tier: tier.selection,
                });
            });
        });

        return options;
    };

    const handleQty = (index, option) => {
        const updated = [...rows];

        updated[index] = {
            ...updated[index],
            qty: option.value,
            price: option.price,
            lineTotal: option.value * option.price,
        };

        setRows(updated);
    };

    const handleSelect = (value, index) => {
      const updated = [...rows];
      updated[index] = { ...updated[index], item: value };
      setRows(updated);
    };

  // const handleQty = (index, qty) => {
  //   const newRows = [...rows];     // create new array
  //   newRows[index] = { ...newRows[index], qty };  // update only one row
  //   setRows(newRows);              // update state
  // };

  // const addRow = () => {
  //   setRows([...rows, { item: null, qty: 1 }]);
  // };

    const addRow = () => {
        setRows([...rows, { item: null, qty: null, price: null, lineTotal: 0 }]);
    };

  const submitQuote = () => {
    const output = rows
        .filter(r => r.item) // only rows with selected item
        .map(r => ({
            id: r.item.value,
            name: r.item.label,
            qty: r.qty,
            date: r.item.date_text
        }));

    console.log("Final Submitted Data:", output);
 };


  
  return (

    <Container className = "mt-4">

      <h4>Item List</h4>

        <Row className="mb-3 align-items-center">
          <Col  md="6">
            <h5>Date: <span className="dateSelected"> {date ? date.toDateString() : "Select a Date"}</span></h5> 
          </Col>
          <Col  md="6">
          <DatePicker
            ref={dateRef}
            selected={date}
            onChange={(d) => {
              setDate(d); 
              setdateSelected(true); 
            }}
            className="d-none"   // hide input
            minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
            maxDate={new Date(new Date().setMonth(new Date().getMonth() + 3))}
            filterDate={(d) => d.getDay() !== 0 && d.getDay() !== 6}
            />
            <Button
              variant="link"
              className="d-flex justify-content-end w-100"  
              onClick={() => dateRef.current.setOpen(true)}   // open popup
            >
            <Image src={IMG_BASE + "/schedule.png"} thumbnail />
          </Button>
        </Col>
        </Row>
        <Form.Group as="fieldset" disabled={!dateSelected} className={!dateSelected ? "opacity-50" : ""}>
          {rows.map((row, index) => (
            <Row className="mb-3 justify-content-end" key={index}>
              <Col  md="5">
                <AsyncSelect
                  loadOptions={loadOptions}
                  defaultOptions
                  value={row.item}
                  onChange={(v) => handleSelect(v, index)}
                  placeholder="Search item..."
                  isClearable
                />
              </Col>
                {/* Qty dropdown */}
                <Col md="4">
                    <AsyncSelect
                        value={
                            row.qty
                                ? { label: `${row.qty} pcs`, value: row.qty, price: row.price }
                                : null
                        }
                        onChange={(opt) => handleQty(index, opt)}
                        loadOptions={() => Promise.resolve(getQtyOptions(row.item))}
                        defaultOptions={getQtyOptions(row.item)}
                        placeholder="Select Qty"
                        isClearable
                        isDisabled={!row.item}
                    />
                </Col>
                {/* Line total */}
                <Col md="3">
                    <strong>${row.lineTotal.toFixed(2)}</strong>
                </Col>
            </Row>
          ))}
        <Button variant="primary" className="add-row-quote float-end" onClick={addRow}>+ Add Row</Button>
        <Button variant="primary" className="submit-quote" onClick={submitQuote}>Submit Quote</Button>
      </Form.Group>
   </Container>
  );
}