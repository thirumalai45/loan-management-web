def calculate_emi(
    principal: float,
    annual_interest_rate: float,
    number_of_payments: int,
    frequency: str
):

    if number_of_payments <= 0:
        raise ValueError("Number of payments must be greater than 0")

    if principal <= 0:
        raise ValueError("Principal must be greater than 0")

    # Convert annual interest rate to decimal
    annual_rate = annual_interest_rate / 100

    if frequency == "weekly":

        periods_per_year = 52

    elif frequency == "monthly":

        periods_per_year = 12

    elif frequency == "yearly":

        periods_per_year = 1

    else:

        raise ValueError(
            "Frequency must be weekly, monthly or yearly"
        )

    # Interest rate for each payment period
    period_rate = annual_rate / periods_per_year

    # Zero interest loan
    if period_rate == 0:

        return round(
            principal / number_of_payments,
            2
        )

    # EMI formula
    emi = (
        principal
        * period_rate
        * (1 + period_rate) ** number_of_payments
    ) / (
        (1 + period_rate) ** number_of_payments - 1
    )

    return round(emi, 2)