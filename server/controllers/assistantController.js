import Car from "../models/Car.js";
import Booking from "../models/Booking.js";

// helper to check simple booking overlap
const checkAvailability = async (carId, pickupDate, returnDate) => {
  const bookings = await Booking.find({
    car: carId,
    pickupDate: { $lte: returnDate },
    returnDate: { $gte: pickupDate },
  });
  return bookings.length === 0;
};

export const assistantReply = async (req, res) => {
  try {
    const { message, pickupDate, returnDate } = req.body;
    if (!message) return res.json({ success: false, message: "No message provided" });

    const text = message.toLowerCase();

    // collect available locations from DB
    const locations = await Car.distinct('location');
    const foundLocation = locations.find(loc => text.includes(loc.toLowerCase()));

    // Intent: availability
    if (text.includes('available') || text.includes('availability') || text.includes('available cars')) {
      if (foundLocation) {
        // if dates provided, check per-car availability
        const cars = await Car.find({ location: foundLocation, isAvaliable: true }).limit(10);
        if (cars.length === 0) {
          return res.json({ success: true, reply: `Sorry — there are no cars available in ${foundLocation} right now.` });
        }

        if (pickupDate && returnDate) {
          const available = [];
          for (const car of cars) {
            const isAvail = await checkAvailability(car._id, pickupDate, returnDate);
            if (isAvail) available.push(car);
          }
          if (available.length === 0) return res.json({ success: true, reply: `No cars are free in ${foundLocation} for the provided dates (${pickupDate} → ${returnDate}). Try different dates.` });
          const sample = available[0];
          return res.json({ success: true, reply: `We have ${available.length} car(s) available in ${foundLocation} for ${pickupDate} to ${returnDate}. Example: ${sample.brand} ${sample.model} — ₹${sample.pricePerDay}/day.` });
        }

        const sample = cars[0];
        return res.json({ success: true, reply: `We have ${cars.length} car(s) available in ${foundLocation}. Example: ${sample.brand} ${sample.model} — ₹${sample.pricePerDay}/day. Provide pickup and return dates to check specific availability.` });
      }

      // no location specified
      const total = await Car.countDocuments({ isAvaliable: true });
      return res.json({ success: true, reply: `There are ${total} cars available across our locations. Tell me a pickup location (for example, 'Mangalore Airport') and dates to get local availability.` });
    }

    // Intent: pricing
    if (text.includes('price') || text.includes('cost') || text.includes('rent') || text.includes('fee')) {
      // try find a model or brand keyword
      const brands = await Car.distinct('brand');
      const brandFound = brands.find(b => text.includes(b.toLowerCase()));
      if (brandFound) {
        const car = await Car.findOne({ brand: brandFound }).sort({ pricePerDay: 1 });
        if (car) return res.json({ success: true, reply: `A ${car.brand} ${car.model} typically rents for around ₹${car.pricePerDay}/day. Provide dates for a full price.` });
      }
      const cheapest = await Car.findOne().sort({ pricePerDay: 1 });
      if (cheapest) return res.json({ success: true, reply: `Daily prices start from ₹${cheapest.pricePerDay}/day. Tell me a location or car model for precise rates.` });
    }

    // Intent: booking flow
    if (text.includes('how to book') || text.includes('how do i book') || text.includes('book a car') || text.includes('booking')) {
      return res.json({ success: true, reply: `To book: 1) Choose pickup location and dates; 2) Pick a car and open its details; 3) Click 'Book' and follow the checkout steps. I can search cars for your location and dates if you share them.` });
    }

    // Intent: car features / specs
    if (text.includes('seat') || text.includes('seat capacity') || text.includes('seating') || text.includes('fuel') || text.includes('transmission')) {
      // find a car mention, else give guidance
      const cars = await Car.find().limit(1);
      if (cars.length) {
        const c = cars[0];
        return res.json({ success: true, reply: `${c.brand} ${c.model}: Seats ${c.seating_capacity}, Fuel ${c.fuel_type}, Transmission ${c.transmission}. Ask for other models or locations.` });
      }
    }

    // Simple FAQs
    const faqs = [
      { q: 'cancel', a: 'To cancel a booking go to My Bookings, select the booking and choose cancel. Cancellation policy varies by car — contact support for edge cases.' },
      { q: 'support', a: 'You can reach support via email or phone listed on the Contact page. For urgent help, please call our support number.' },
      { q: 'hours', a: 'Our service is available 24/7 online — search and book anytime. Owners may have specific pickup hours.' }
    ];
    for (const f of faqs) {
      if (text.includes(f.q)) return res.json({ success: true, reply: f.a });
    }

    // Fallback: encourage user to give more details or ask about availability/pricing
    return res.json({ success: true, reply: "Hi — I can help with availability, prices, locations, booking steps, and car specs. Try: 'Available cars at Mangalore Airport from YYYY-MM-DD to YYYY-MM-DD' or ask 'What is the price of a Toyota Corolla?'" });

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
