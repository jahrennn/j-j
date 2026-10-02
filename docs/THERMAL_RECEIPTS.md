# PT-210 sales receipts

The PT-210 uses a 57 mm wide thermal paper roll; `57 x 30 mm` describes the
roll width and roll diameter, not a 30 mm tall receipt. The printable head is
about 48 mm wide. The receipt layout uses that printable width and sizes the
page length to the actual content.

In **Sales Report**, click **Print Receipt** to choose one sale, or use the
printer icon on a sales row. The preview includes the business name, customer,
sale number and date, item and quantity, unit and total price, payment method,
delivery method, and delivery address when applicable. For Utang, the printed
downpayment and balance are **at the time of sale**; use Loan Tracker for the
current balance after later payments.

Click **Print Receipt** in the preview. A dedicated receipt window opens and
the operating system's print dialog appears. Select the installed PT-210 (or
its compatible print service), 57/58 mm roll paper, 100% scale, no headers or
footers, and minimum margins. Keep the receipt window's Print button as a
fallback if the automatic dialog does not appear. Browser printing requires
the printer to be available through the device's driver or print service;
the web app cannot pair directly to Bluetooth or choose the printer silently.

On an Android tablet, the primary action is **Download Image**. It creates a
384-pixel-wide PNG for the PT-210's printable head. Open **Files > Downloads**
on the tablet, select the `receipt-TXN-....png` image, and import or share it
to the compatible PT-210 printer app. Gallery may also display the image,
depending on the tablet; Downloads is the reliable place to find it. In the
printer app, use the 57/58 mm paper setting and fit the image to the printable
width. **Browser Print** remains available if the printer is installed as an
Android print service. On desktop, **Print Receipt** remains the main action
and **Download PNG** is available beside it.

An additive Flyway migration, `V9__persist_sale_delivery_method.sql`, records
the delivery choice for new sales. It infers the choice for older sales from
their saved address: `Pick up` becomes Pick up; all other addresses become
Deliver. Review unusual legacy addresses before relying on old receipts.

The browser and operating-system print dialog can override page sizing. Test
one Cash and one Utang receipt on the actual printer before routine use,
checking text width, address wrapping, paper feed, and the configured media.
