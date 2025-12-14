from django.db import migrations, models


def forwards_populate_chain(apps, schema_editor):
    FoodItem = apps.get_model("fooditem", "FoodItem")
    for food in FoodItem.objects.select_related(
        "donation__restaurant__chain"
    ).all():
        restaurant = getattr(food.donation, "restaurant", None)
        chain = getattr(restaurant, "chain", None) if restaurant else None
        if chain:
            food.chain_id = chain.pk
            food.save(update_fields=["chain"])


def backwards_clear_chain(apps, schema_editor):
    FoodItem = apps.get_model("fooditem", "FoodItem")
    FoodItem.objects.update(chain=None)


class Migration(migrations.Migration):
    dependencies = [
        ("restaurant_chain", "0001_initial"),
        ("fooditem", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="fooditem",
            name="chain",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="food_items",
                db_column="chain_id",
                to="restaurant_chain.restaurantchain",
            ),
        ),
        migrations.RunPython(
            forwards_populate_chain,
            backwards_clear_chain,
        ),
    ]
