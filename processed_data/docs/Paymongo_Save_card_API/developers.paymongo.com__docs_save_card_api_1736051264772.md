**Account Configuration and Save Card Feature**

To get started with integrating the PayMongo API, you need to configure your account first. Please message [email address] to request key configuration.

**Save Card Feature Overview**

The Save Card feature allows merchants to save and reuse card details on our platform. This feature serves two purposes:

1. **Improved User Experience**: By saving a card, customers can make future purchases without having to enter their payment information.
2. **Increased Revenue Potential**: Merchants can charge customers off-session using saved cards.

**Session Type**

To distinguish between the two main use cases, we'll denote them as:

* **On-Session**: Allows cardholders to use a vaulted card when they want to make a purchase in the same session.
* **Off-Session**: Allows merchants to charge cardholders even without their intervention.

**Integrating Save Card through Payment Intent Workflow**

The payment intent workflow is the main workflow used to make payments via PayMongo. To enable save card, you need to add a few additional steps to this existing workflow:

1. **Create a Customer**
	* The merchant needs to create a customer to be able to save cards on their account.
2. **Save a Card to a Customer**
	* Once the customer is created, the merchant can save a card using the following attributes:
```json
"setup_future_usage": {
  "session_type": "on_session",
  "customer_id": "cus_Exy3jegPk4eEagpQcE6wnLB4"
}
```
**Using a Saved Card**

We've designed the following workflow to use a saved card:

1. **Verify Customer Existence**
	* The merchant can verify if the customer exists in their database by retrieving the customer using the `Retrieve Customer` endpoint.
2. **Choose Among Saved Payment Methods**
	* Once the customer is verified, the merchant can fetch all saved payment methods of the customer and choose among them to charge with.
3. **Update CVC (On-Session Transactions)**
	* After selecting a vaulted card, the merchant needs to collect the CVC and update the payment method in the backend using the `Update Payment Method` endpoint.
4. **Charge Saved Payment Method**
	* To charge the saved payment method, the merchant can create a new payment intent using the `Create Payment Intent` endpoint and attach the updated payment method using the `Attach to Payment Intent` endpoint.

**Deleting a Customer or Saved Card**

The merchant can delete a customer or a saved card using the following endpoints:

* `Delete Customer`
* `Delete Payment Method`

**Test Mode Support**

Any test card that simulates a successful purchase can be used for vaulting.

**System Limitations**

We currently only support card vaulting for merchants who integrate via our API, have undergone enhanced KYC, and have the ability to verify cardholder identity on checkout.