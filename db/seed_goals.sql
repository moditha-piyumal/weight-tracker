DELETE FROM goals; -- optional, clears old data

INSERT INTO goals (order_idx, threshold_kg, title, message, unlocked_at_utc) VALUES
(1, 83.0, 'Goal 1', '⚔️ “The Watch has stood firm, and so have you. 83.0 kg — another battle won. Reward: Movie Night with Vodka.”', NULL),
(2, 80.0, 'Goal 2', '🐉 “The realm whispers your name, warrior of will. 80.0 kg — you’ve earned another Movie Night with Vodka.”', NULL),
(3, 76.7, 'Goal 3', '💎 “A lord of true resolve — 76.7 kg. You rise above weakness and deserve your Luxury Perfume Bottle.”', NULL),
(4, 75.0, 'Goal 4', '🔥 “Steel sharpens steel. You’ve hit 75.0 kg — reward yourself with another Movie Night with Vodka.”', NULL),
(5, 73.5, 'Goal 5', '🦾 “Even dragons would envy your discipline. 73.5 kg — reward: Movie Night with Vodka.”', NULL),
(6, 71.7, 'Goal 6', '🛡️ “Your will is unbroken. 71.7 kg — another night, another Movie Night with Vodka.”', NULL),
(7, 69.0, 'Goal 7', '🎧 “A true victory tune plays for you. 69.0 kg — claim your New Audio System.”', NULL),
(8, 65.0, 'Goal 8', '🍻 “Meet your friends in town, hero. 65.0 kg — you’ve earned this gathering.”', NULL),
(9, 63.7, 'Goal 9', '🖥️ “Your domain strengthens. 63.7 kg — reward: New Customized Computer Table.”', NULL),
(10, 61.2, 'Goal 10', '🥊 “Strength and spirit unite. 61.2 kg — reward: Punching Bag.”', NULL),
(11, 59.9, 'Goal 11', '🍺 “The Night is yours. 59.9 kg — reward: Movie Night with Beer.”', NULL),
(12, 58.5, 'Goal 12', '💆 “You’ve earned peace, warrior. 58.5 kg — reward: Spa Ceylon Treat.”', NULL),
(13, 57.0, 'Goal 13', '🏡 “You rebuild your keep. 57.0 kg — reward: Wall Plaster of the House.”', NULL),
(14, 56.0, 'Goal 14', '🎉 “Gather your bannermen. 56.0 kg — reward: Party for Friends.”', NULL),
(15, 55.0, 'Goal 15', '🥇 “The realm hails your triumph. 55.0 kg — reward: Victory Lap with Vodka.”', NULL);
